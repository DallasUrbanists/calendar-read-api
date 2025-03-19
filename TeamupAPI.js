require("dotenv").config();
const axios = require('axios');

const BASE = "https://api.teamup.com/";

class TeamupAPI {
  constructor(apiKey = null, mainCalendarId = null, subCalendarId = null) {
    this.apiKey = apiKey ?? process.env.TEAMUP_APIKEY;
    this.mainCalendarId = mainCalendarId ?? process.env.TEAMUP_DALLAS_URBANISTS_COMMUNITY_CALENDAR_MODIFIABLE_ID;
    this.subCalendarId = subCalendarId;
  }

  apiUrl(path) {
    return BASE + this.mainCalendarId + '/' + path;
  }
  
  apiHeaders() {
    return {
      Accept: 'application/json, text/html',
      'Teamup-Token': this.apiKey,
    };
  }
  
  setSubCalendar(id) {
    this.subCalendarId = id;
    return this;
  }

  async update(event) {
    const options = {
      method: 'PUT',
      url: this.apiUrl(`events/${event.teamupId}`),
      headers: this.apiHeaders(),
      data: event.translateForTeamup(this.subcalendarId)
    };

    console.log(options.data.who);

    try {
      const { data } = await axios.request(options);
      return data.event;
    } catch (error) {
      console.error(error.response.data);
      return null;
    }
  }

  async post(event) {
    const options = {
      method: 'POST',
      url: this.apiUrl(`events`),
      headers: this.apiHeaders(),
      data: event.translateForTeamup(this.subcalendarId)
    };

    try {
      const { data } = await axios.request(options);
      return data.event;
    } catch (error) {
      console.error(error.response.data);
      return null;
    }
  }

  async search(event) {
    const options = {
      method: 'GET',
      url: this.apiUrl('events'),
      headers: this.apiHeaders(),
      params: {
        limit: 1,
        query: `"${event.title}"`,
        subcalendarId: [this.subCalendarId],
        startDate: event.start.format('YYYY-MM-DD'),
        endDate: event.end.format('YYYY-MM-DD')
      }
    };
   
    try {
      const { data } = await axios.request(options);
      if (data.events.length > 0) {
        return data.events[0];
      }
      return null;
    } catch (error) {
      console.error(error);
    }
  }
}

module.exports = TeamupAPI;