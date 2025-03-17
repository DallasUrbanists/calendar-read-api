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
  }

  calendarUrl(params = [], useSubcalendarId = true) {
    const baseUrl = `${BASE}/${this.calendarId}`;
    if (useSubcalendarId && this.subcalendarId) {
      params.push(`subcalendarId[]=${this.subcalendarId}`);
    }
    return `${baseUrl}/events?${params.join('&')}`;
  }

  async fetchEvents() { 
    if (!this.fetchedEvents) {
      const fetchURL = this.calendarUrl([
        'startDate=2020-01-01',
        'endDate=2026-12-31',
      ]);
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
      start_dt: event.start_dt,
      end_dt: event.end_dt,
      title: event.title,
      notes: event.notes,
      location: event.location,
      all_day: event.all_day ?? false,
      subcalendar_ids: [this.subcalendarId],
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
    console.log('All events before push:', allEvents);
    allEvents.push(newEvent);
    console.log('All events after push:', allEvents);
    this.saveCache(this.fetchedUrl, { events: allEvents });

    return newEvent;
  }

}

module.exports = TeamUpCalendar;