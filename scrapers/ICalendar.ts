import axios from "axios";
import * as ical from "ical";
import moment from "moment";
import Event, { initEventModel } from "../models/Event";
import {
  Organization,
  adhocOrg,
  findOrganization,
} from "../models/Organizations";
import { eventIsRelevant } from "../utilities";

export class ICalendar {
  public icsURL: string;
  public sourceOrg: Organization;

  constructor(icsURL: string, sourceOrg: string) {
    this.icsURL = icsURL;
    this.sourceOrg = findOrganization(sourceOrg) ?? adhocOrg(sourceOrg);
    initEventModel();
  }

  async getEventsFromStore(): Promise<Event[]> {
    return await Event.findAll({
      where: {
        sourceOrg: this.sourceOrg.name,
      },
    });
  }

  /**
   * Update database of events by insert new events and updating existing ones.
   */
  async updateDatabase(): Promise<Event[]> {
    // Array of events from source
    const fetchedEvents: Event[] = await this.fetchEventsFromSource();

    // For each event, either create new record in database or update existing
    fetchedEvents.filter(eventIsRelevant).forEach((fetchedEvent) => {
      Event.findOne({ where: { sourceId: fetchedEvent.sourceId } }).then(
        (storedEvent) => {
          // If we could not find a stored event, then insert into database
          // by storing fetched event directly in database
          if (!storedEvent) {
            fetchedEvent.save();
            // Otherwise, update the existing stored event with data in new event
          } else {
            const lastModified = fetchedEvent.lastModified;
            storedEvent.updateFrom(fetchedEvent);
            // We should always respect the last modified date according to source
            storedEvent.lastModified = lastModified;
            storedEvent.save();
          }
        }
      );
    });

    return fetchedEvents;
  }

  /**
   * Get all events available from source. Apply normalization to all events and
   * filter out ignorable events (e.g. events tagged [IGNORE] in title or description)
   */
  async fetchEventsFromSource(): Promise<Event[]> {
    return (await this.fetchEventsFromICS())
      .map((event) => event.normalize())
      .filter((event) => !event.isIgnorable());
  }

  /**
   * Fetches an ICS calendar file from a URL and parses it into array of Event objects
   */
  async fetchEventsFromICS(): Promise<Event[]> {
    console.log(`Fetching events from ICS calendar: ${this.icsURL}`);
    const icsData = (await axios.get(this.icsURL, { responseType: "text" }))
      .data;
    const isParseableEvent = (data: ical.CalendarComponent) =>
      data.summary &&
      data.start;

    try {
      const response = Object.values(ical.parseICS(icsData));
      console.log("Response included ICS events:", response.length);
      const parseable = response.filter(isParseableEvent);
      console.log("Number of parseable ICS events:", parseable.length);
      return parseable.map(this.parseEventFromICS, this);
    } catch (error) {
      console.error("Error fetching or parsing ICS:", error);
      return [];
    }
  }

  /**
   * Builds an Event instance based on ICS data
   */
  parseEventFromICS(icsData: ical.CalendarComponent): Event {
    const start = moment(icsData?.start);
    const end = icsData.end ? icsData.end : start.clone().add("1", "h");
    icsData.lastmodified = icsData.lastmodified ?? icsData.created;
    return Event.build({
      // IDENTIFIERS
      sourceId: icsData.uid,
      // BASIC DETAILS
      title: icsData.summary ?? "",
      start,
      end,
      isAllDay: icsData.datetype === "date",
      location: icsData.location ?? "",
      description: icsData.description ?? "",
      hosts: [this.sourceOrg.name],
      // HISTORY
      sourceTitle: icsData.summary ?? "",
      sourceOrg: this.sourceOrg.name,
      creationDate: icsData.created,
      lastModified: icsData.lastmodified,
    });
  }
}
