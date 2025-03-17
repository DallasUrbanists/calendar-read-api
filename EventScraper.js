const axios = require('axios');

class EventScraper {
  /**
   * Fetches the HTML content of a webpage.
   * @param {string} url - The URL of the webpage to fetch.
   * @returns {Promise<string>} - Returns a promise that resolves to the HTML content of the webpage.
   */
  async fetchHTML(url) {
    try {
      const { data } = await axios.get(url, {
        headers: { 'User-Agent': 'Mozilla/5.0' } // Prevents blocking by some websites
      });
      return data;
    } catch (error) {
      console.error(`Error fetching the webpage: ${error.message}`);
      return null;
    }
  }
}

module.exports = EventScraper;