require("dotenv").config();
import axios from "axios";
import { cutoffForOldEvents, waitRandomSeconds } from "../utilities";
import Event from "../models/Event";
import moment from "moment";
import _, { isEmpty } from "lodash";

const earliestPostedEventDate = moment().subtract(364, 'days');

export default class TeamupAPI {
  private static readonly API_URL = "https://api.teamup.com/";
  private static readonly DEFAULT_CALENDAR_ID = process.env.TEAMUP_DALLAS_URBANISTS_COMMUNITY_CALENDAR_MODIFIABLE_ID;
  private static readonly HEADERS = {
    'Content-Type': 'application/json',
    Accept: 'application/json, text/html',
    'Teamup-Token': process.env.TEAMUP_APIKEY,
  };

  private static fetchedEvents: any[] = [];

  public static async fetchEvents(calendarId?: string): Promise<any[]> {
    if (!calendarId) {
      calendarId = TeamupAPI.DEFAULT_CALENDAR_ID;
    }

    if (TeamupAPI.fetchedEvents.length === 0) {
      try {
        const response = await axios.request({
          method: 'GET',
          url: `${this.API_URL}${calendarId}/events`,
          params: {
            startDate: cutoffForOldEvents.format(),
            endDate: cutoffForOldEvents.add(365, 'days').format()
          },
          headers: this.HEADERS
        });
        TeamupAPI.fetchedEvents = response.data.events;
      } catch (e) {
        console.error("Error fetching events from Teamup API:", e);
      }
    }

    return TeamupAPI.fetchedEvents; 
  }

  public static isPostable(event: Event): boolean {
    event.normalize();

    if (!event.teamup) {
      return false;
    }
    if (event.teamup.subCalendars.length === 0) {
      return false;
    }
    if (event.start.isBefore(earliestPostedEventDate)) {
      return false;
    }
    if (!event.title) {
      return false;
    }

    return true;
  }

  public static async postEvent(event: Event): Promise<Event> {
    const calendarId = _.isEmpty(event.teamup?.mainCalendar)
      ? TeamupAPI.DEFAULT_CALENDAR_ID
      : event.teamup?.mainCalendar;

    if (!TeamupAPI.isPostable(event)) {
      console.error("Event is not postable:", event.title);
      return event;
    }

    try {
      const response = await axios.request({
        method: 'POST',
        url: `${this.API_URL}${calendarId}/events`,
        data: event.normalize().asTeamupData(),
        headers: this.HEADERS
      });
      if (response.data) {
        event.teamupId = response.data.event.id;
        event.save();
        return event;
      }
    } catch (e:any) {
      console.error("Error posting event to Teamup API:", e.response.data);
      console.log(`${this.API_URL}${calendarId}/events`);
    }
    return event;
  }

  public static async updateEvent(event: Event): Promise<Event> {
    const calendarId = event.teamup?.mainCalendar ?? TeamupAPI.DEFAULT_CALENDAR_ID;
    const eventId = event.teamupId;
    const eventData:any = event.normalize().asTeamupData();
    eventData.id = eventId; // Ensure the event ID is included in the data 

    if (!TeamupAPI.isPostable(event)) {
      console.error("Event is not postable:", event.title);
      return event;
    }

    if (!eventId) {
      console.error("Event ID not found for update:", event);
      return event;
    }

    try {
      const response = await axios.request({
        method: 'PUT',
        url: `${this.API_URL}${calendarId}/events/${eventId}`,
        data: eventData,
        headers: this.HEADERS
      });
      if (response.data) {
        return event;
      }
    } catch (e:any) {
      console.error("Error updating event in Teamup API:", e.response.data);
      console.log(eventData)
    }
    return event;
  }

  public static async fetchEvent(eventId: string, calendarId?: string, fetchBeyond: boolean = false): Promise<any> {
    if (!calendarId) {
      calendarId = TeamupAPI.DEFAULT_CALENDAR_ID;
    }
    // Check if the event is already in the cached events
    const fetchedEvents:Array<any> = await TeamupAPI.fetchEvents(calendarId);
    const fetchedEvent = fetchedEvents.find((event) => event.id === eventId);
    // If the event is found in the cache, return it
    if (fetchedEvent) {
      return fetchedEvent;
    }

    // If not, fetch it from the API
    // Note: This is a separate API call to fetch a single event
    if (fetchBeyond) {
      try {
        const response = await axios.request({
          method: 'GET',
          url: `${this.API_URL}${calendarId}/events/${eventId}`,
          headers: this.HEADERS
        });
        if (!response.data) {
          console.error("No data found for the event with ID:", eventId);
          return null;
        }
        // Cache the fetched event
        TeamupAPI.fetchedEvents.push(response.data);

        // Wait for a random time between 2 and 3 seconds.
        // This ensures that we don't hit the API too hard.
        await waitRandomSeconds(1, 2); 

        return response.data;
      } catch (e) {
        console.log("Event not found in Teamup API:", eventId);
      }
    }

    // If the event is not found, return null
    return null;
  }

  public static async searchEvent(event: Event): Promise<any> {
    const events = await TeamupAPI.fetchEvents();
    const searchResults = events.filter((teamupData) => {
      if (teamupData.title && teamupData.start_dt && teamupData.end_dt) {
        return event.isProbablySameAs(Event.build({
          title: teamupData.title,
          start: moment(teamupData.start_dt),
          end: moment(teamupData.end_dt),
          location: teamupData.location
        }));
      }
      return false;
    });

    if (searchResults.length > 0) {
      return searchResults[0]; // Return the first match
    }
    return null;
  }

  public static teamupDataToEvent(teamupData: any): Event|null {     
    if (!teamupData) {
      return null;
    }
    if (!teamupData.title || !teamupData.start_dt || !teamupData.end_dt) {
      return null;
    }
    return Event.build({
      teamupId: teamupData.id,
      teamup: { subCalendars: teamupData.subcalendars, mainCalendar: teamupData.calendar_id },
      start: moment(teamupData.start_dt),
      end: moment(teamupData.end_dt),
      isAllDay: teamupData.all_day,
      hosts: teamupData.who ? teamupData.who.split(' + ') : [],
      title: teamupData.title,
      location: teamupData.location,
      description: teamupData.description,
      sourceId: teamupData.id
    });
  }
}
