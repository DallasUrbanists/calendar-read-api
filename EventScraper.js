const axios = require('axios');
const fs = require('fs-extra');
const moment = require('moment');

const USER_AGENT = { 'User-Agent': 'Mozilla/5.0' }; // Prevents blocking by some websites
const HEADERS = { headers: USER_AGENT };
const CACHE_FILE = 'EventScraper.cache.json';
class EventScraper {
  /**
  * Fetches the HTML content of a webpage.
  * @param {string} url - The URL of the webpage to fetch.
  * @returns {Promise<string>} - Returns a promise that resolves to the HTML content of the webpage.
  */
  async fetchHTML(url) {
    const cachedData = await this.getCachedData(url);
    const useCachedData = message => {
      console.log(message + ' Using cached content.');
      return cachedData.html;
    };
    const useNewData = message => {
      console.log(message + ' Fetching new content...');
      return this.updateCache(url);
    };
    
    if (!cachedData) {
      return await useNewData('No cached data found for this URL.');
    }
    if (cachedData.cacheTimestamp && cachedData.cacheTimestamp > moment().subtract(4, 'hour').unix()) {
      return useCachedData(`Cached data is less than four hours old: ${moment.unix(cachedData.cacheTimestamp).fromNow()}.`);
    }

    const headers = await this.getPageHeaders(url);

    if (headers) {
      const lastModified = headers['last-modified'];
      const etag = headers['etag'];
      if (lastModified || etag) {
        console.log('Cached data has last-modified or etag headers to indicate when the target URL was last updated.');
        const lastModifiedMatch = lastModified && cachedData.lastModified === lastModified;
        const etagMatch = etag && cachedData.etag === etag;
        if (lastModifiedMatch || etagMatch) {
          return useCachedData('According to headers, cached data is still up-to-date.');
        }
        return await useNewData('Cached data is outdated.');
      }
      return await useNewData('Headers provide no indication of when target URL was last updated.');
    }
    return useCachedData('For unknown reasons, we failed to retrieve headers for target URL.');
  }
  
  // Function to get headers from a `HEAD` request
  async getPageHeaders(url) {
    try {
      const response = await axios.head(url, HEADERS);
      return response.headers;
    } catch (error) {
      return errorResponse('Error fetching headers', error);
    }
  }
  
  // Load cached data from file
  async getCachedData(url) {
    if (!fs.existsSync(CACHE_FILE)) return null;
    const cache = await fs.readJson(CACHE_FILE);
    return cache[url] || null;
  }
  
  // Fetch and cache new content
  async updateCache(url) {
    try {
      console.log(`Begin fetching ${url}...`);
      const response = await axios.get(url, HEADERS);
      console.log(`Finished fetching ${url}.`);

      const headers = response.headers;
      const html = response.data;
      const lastModified = headers['last-modified'] || null;
      const etag = headers['etag'] || null;
      
      await this.saveCache(url, html, lastModified, etag);
      return html;
    } catch (error) {
      return errorResponse('Error fetching headers', error);
    }
  }
  
  // Save new data to cache
  async saveCache(url, html, lastModified, etag) {
    let cache = {};
    if (fs.existsSync(CACHE_FILE)) {
      cache = await fs.readJson(CACHE_FILE);
    }
    const cacheTimestamp = moment().unix();
    cache[url] = { html, lastModified, etag, cacheTimestamp };
    await fs.writeJson(CACHE_FILE, cache, { spaces: 2 });
  }

  waitRandomSeconds(minSeconds, maxSeconds) {
    const randomDelay = Math.floor(Math.random() * (maxSeconds - minSeconds + 1) + minSeconds) * 1000;
    console.log(`Waiting ${randomDelay / 1000} seconds...`);
    return new Promise(resolve => setTimeout(resolve, randomDelay));
  }
}

function errorResponse(message, error) {
  console.error(`${message}: ${error.message}`);
  return null;
}

module.exports = EventScraper;