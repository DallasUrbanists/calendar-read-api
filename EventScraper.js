require("dotenv").config();
const axios = require('axios');
const fs = require('fs-extra');
const moment = require('moment');

const CACHE_FILE = 'EventScraper.cache.json';
class EventScraper {
  constructor(headers) {
    this.headers = headers;
    this.ttl = process.env.DEFAULT_CACHE_TTL ?? 4;
  }
  /**
  * Fetches the rawResponse content of a webpage.
  * @param {string} url - The URL of the webpage to fetch.
  * @param {any} fallback - The value to use if the URL cannot be fetched.
  * @returns {Promise<string>} - Returns a promise that resolves to the rawResponse content of the webpage.
  */
  async fetchURL(url, fallback = null) {
    const cachedData = await this.getCachedData(url);
    const useCachedData = message => {
      console.log(message + ' Using cached content.');
      return cachedData.rawResponse ?? fallback;
    };
    const useNewData = message => {
      console.log(message + ' Fetching new content...');
      return this.updateCache(url) ?? fallback;
    };
    
    if (!cachedData) {
      return await useNewData('No cached data found for this URL.');
    }
    if (cachedData.cacheTimestamp && cachedData.cacheTimestamp > moment().subtract(this.ttl, 'hour').unix()) {
      return useCachedData(`Cached data is less than ${this.ttl} hours old: ${moment.unix(cachedData.cacheTimestamp).fromNow()}.`);
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
      const response = await axios.head(url, { headers: this.headers });
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
      const response = await axios.get(url, {headers: this.headers});
      console.log(`Finished fetching ${url}.`);

      const headers = response.headers;
      const rawResponse = response.data;
      const lastModified = headers['last-modified'] || null;
      const etag = headers['etag'] || null;
      
      await this.saveCache(url, rawResponse, lastModified, etag);
      return rawResponse;
    } catch (error) {
      return errorResponse('Error fetching headers', error);
    }
  }
  
  // Save new data to cache
  async saveCache(url, rawResponse, lastModified, etag) {
    let cache = {};
    if (fs.existsSync(CACHE_FILE)) {
      cache = await fs.readJson(CACHE_FILE);
    }
    const cacheTimestamp = moment().unix();
    cache[url] = { rawResponse, lastModified, etag, cacheTimestamp };
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