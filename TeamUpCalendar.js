const axios = require('axios');
const moment = require('moment');
const EventScraper = require('./EventScraper.js');

const BASE = "https://api.teamup.com";

class TeamUpCalendar extends EventScraper {
  constructor(apiKey, calendarId, subcalendarId = null) {
    super({
      Accept: "application/json, text/html",
      "Teamup-Token": apiKey,
    });
    this.calendarId = calendarId;
    this.subcalendarId = subcalendarId;
    this.startSearchDate = moment().subtract(3, 'months').format('YYYY-MM-DD');
    this.endSearchDate = moment().add(1, 'years').format('YYYY-MM-DD');
  }

  calendarUrl(params = [], useSubcalendarId = true) {
    const baseUrl = `${BASE}/${this.calendarId}`;
    if (useSubcalendarId && this.subcalendarId) {
      params.push(`subcalendarId[]=${this.subcalendarId}`);
    }
    return `${baseUrl}/events?${params.join('&')}`;
  }

  async fetchEvents(limitDateRange=true) { 
    if (!this.fetchedEvents) {
      // Look for events within search range
      const fetchDateRange = [
        `startDate=${this.startSearchDate}`,
        `endDate=${this.endSearchDate}`,
      ];
      const fetchURL = this.calendarUrl(fetchDateRange);
      const fetchResult = await this.fetchURL(fetchURL, { events: [] });
      this.fetchedEvents = fetchResult.events;
      this.fetchedUrl = fetchURL;
    }

    return this.fetchedEvents ?? [];
  }

  async findEvent(queryTitle, queryDate) {
    const events = await this.fetchEvents();
    if (events) {
      const queryMoment = moment(queryDate);
      const search = events.filter(event => event && event.title === queryTitle && queryMoment.isSame(event.start_dt, 'day'));
      return search.length > 0 ? search[0] : null;  
    }
    return null;
  }

  async postEvent(event) {
    const params = {
      remote_id: event.remote_id ?? null,
      start_dt: event.start_dt,
      who: event.who ?? '',
      end_dt: event.end_dt,
      title: event.title,
      notes: event.notes,
      location: event.location,
      all_day: event.all_day ?? false,
      subcalendar_ids: [this.subcalendarId],
      custom: event.custom ?? {},
    };

    console.log('Posting event:', params);

    const postResponse = await axios.request({
      method: 'post',
      url: this.calendarUrl([], false),
      headers: this.headers,
      data: params,
    });
    const newEvent = postResponse.data.event;
    const allEvents = await this.fetchEvents();
    this.saveCache(this.fetchedUrl, { events: allEvents });

    return newEvent;
  }

}

module.exports = TeamUpCalendar;