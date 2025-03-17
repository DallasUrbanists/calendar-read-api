const EventScraper = require('./EventScraper.js');
const cheerio = require('cheerio');
const moment = require('moment');
const parseToMoment = require('./parse-to-moment.js');

const DOMAIN = 'https://actionnetwork.org';

class ActionNetworkEventScraper extends EventScraper {
  /**
   * @param {string} mainUrl - The URL of the Action Network web page to scrape.
   */
  constructor(mainUrl) {
    super({ 'User-Agent': 'Mozilla/5.0' }); // Prevents blocking by some websites
    this.mainUrl = mainUrl;
  }
  
  async needsToFetch(event) {
    const cached = await this.getCachedData(event.link);
    return cached === null;
  }

  /**
  * Gets an array of event titles scraped from the Action Network web page.
  * @returns {Promise<Object>} - Returns a promise that resolves to an array of objects representing the events.
  */
  async fetchEventList() {
    const html = await this.fetchURL(this.mainUrl);
    if (!html) return;
    if (html.includes('CAPTCHA check')) return captchaAbort([]);

    const $ = cheerio.load(html);
    const extractEventElement = (string) => string.trim().replace("group_public_action_list_array.push({ li_wrapper: '", "").replace("',", "");
    const eventElements = $('#our_actions script').html().split(/\r?\n/).filter(line=>line.includes(DOMAIN)).map(extractEventElement);
    
    return eventElements.map(eventElement => {
      const $ = cheerio.load(eventElement);
      return {
        link: $('a').attr('href'),
        img: $('img').attr('src'),
        title: $('a').text()
      };
    });
  };

  async fetchEventDetails(eventObject) {
    const html = await this.fetchURL(eventObject.link);
    if (!html) return eventObject;
    if (html.includes('CAPTCHA check')) return captchaAbort(eventObject);
    try {
      const $ = cheerio.load(html);
      const dateElements = $('.event_date');

      // Abort if we can't find at least one event date, 
      if (dateElements.length === 0) return eventObject;

      const startMoment = parseToMoment(dateElements.eq(0).text());
      const endMoment = dateElements.length > 1
        ? parseToMoment(dateElements.eq(1).text())
        : startMoment.clone().add(1, 'hour');
      const location = $('.event_location') ? $('.event_location').text().trim() : '';
      const description = $('.action_description') ? $('.action_description').text().trim() : '';

      return {
        ...eventObject,
        startDate: startMoment.format('YYYY-MM-DDTHH:mm:ssZ'),
        endDate: endMoment.format('YYYY-MM-DDTHH:mm:ssZ'),
        location: location,
        description: description
      };
    } catch (e) {
      console.log('Failed to parse details for this event from Action Network:', e);
      return eventObject;
    }
  }

  convertDatetimeStringToMoment(datetimeString) {
    // Parse the date (extracting the relevant parts manually)
    const extractedDate = datetimeString.match(/(.+) • (.+) • (.+) \((.+)\)/);
    const datePart = extractedDate[1];  // "Tuesday, March 18, 2025"
    const timePart = extractedDate[2];  // "6:00 PM"

    // Convert to Moment.js object
    return moment(`${datePart} ${timePart}`, "dddd, MMMM D, YYYY h:mm A", "America/Chicago");
  };
}

function captchaAbort(fallback) {
  console.log('CAPTCHA check triggered. Aborting.');
  return fallback;
}

module.exports = ActionNetworkEventScraper;