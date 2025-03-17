const axios = require('axios');
const BASE = "https://api.teamup.com";

class TeamUpCalendar {
  constructor(apiKey, calendarId, subcalendarId = null) {
    this.apiHeaders = {
      Accept: "application/json, text/html",
      "Teamup-Token": apiKey,
    };
    this.calendarId = calendarId;
    this.subcalendarId = subcalendarId;
  }

  async request(method, url, fallback = null) {
    try {
      const { data } = await axios.request({
        headers: this.apiHeaders,
        method: method,
        url: url
      });
      return data.events;
    } catch (error) {
      console.error(error);
      return fallback;
    }
  }

  async fetchEvents() {
    const calendarPath = `${BASE}/${this.calendarId}/events`;
    const params = [
      'startDate=2020-01-01',
      'endDate=2026-12-31',
    ];

    if (this.subcalendarId) {
      params.push(`subcalendarId[]=${this.subcalendarId}`);
    }

    return await this.request("GET", `${calendarPath}?${params.join('&')}`, []);
  }

}

module.exports = TeamUpCalendar;