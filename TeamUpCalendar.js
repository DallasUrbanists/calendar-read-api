const axios = require('axios');
const BASE = "https://api.teamup.com";
const EventScraper = require('./EventScraper.js');

class TeamUpCalendar extends EventScraper {
  constructor(apiKey, calendarId, subcalendarId = null) {
    super({
      Accept: "application/json, text/html",
      "Teamup-Token": apiKey,
    });
    this.calendarId = calendarId;
    this.subcalendarId = subcalendarId;
  }

  async fetchEvents() {
    const params = [
      'startDate=2020-01-01',
      'endDate=2026-12-31',
    ];

    if (this.subcalendarId) params.push(`subcalendarId[]=${this.subcalendarId}`);

    return await this.fetchURL(`${BASE}/${this.calendarId}/events?${params.join('&')}`);
  }

}

module.exports = TeamUpCalendar;