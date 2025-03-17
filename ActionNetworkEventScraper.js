const EventScraper = require('./EventScraper.js');
const cheerio = require('cheerio');
const moment = require('moment');

const DOMAIN = 'https://actionnetwork.org';

class ActionNetworkEventScraper extends EventScraper {
  /**
   * @param {string} mainUrl - The URL of the Action Network web page to scrape.
   */
  constructor(mainUrl) {
    super({ 'User-Agent': 'Mozilla/5.0' }); // Prevents blocking by some websites
    this.mainUrl = mainUrl;
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
    const $ = cheerio.load(html);
    const datetime = $('.event_info .event_date .js-event_datetime').attr('title');
    const eventMoment = this.convertDatetimeStringToMoment(datetime);

    return {
      ...eventObject,
      startDate: eventMoment.format('YYYY-MM-DDTHH:mm:ssZ'),
      endDate: eventMoment.add(1, 'hours').format('YYYY-MM-DDTHH:mm:ssZ'),
      location: $('.event_info .event_location').text().trim(),
      description: $('.action_description').text().trim()
    };
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