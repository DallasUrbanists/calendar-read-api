import axios from "axios";
import * as cheerio from "cheerio";
import moment from "moment";
import Event, { initEventModel } from "../Models/Event";
import { cleanAndParseJSON, eventIsRelevant } from "../utilities";

export class DBCWebsiteScraper {
  constructor(public sourceURL: string, public sourceOrg: string) {
    this.sourceURL = sourceURL;
    this.sourceOrg = sourceOrg;
    initEventModel();
  }

  async updateDatabase(): Promise<void> {
    const extractedData = await this.extractDataFromWebpage();
    const fetchedEvents = extractedData.map(this.convertDataToEvent, this);

    // For each event, either create new record in database or update existing
    fetchedEvents.filter(eventIsRelevant).forEach((fetchedEvent: Event) => {
      Event.findOne({ where: { sourceId: fetchedEvent.sourceId } }).then(
        (storedEvent) => {
          // If we could not find a stored event, then insert into database
          // by storing fetched event directly in database
          if (!storedEvent) {
            fetchedEvent.save();
            // Otherwise, update the existing stored event with data in new event
          } else {
            storedEvent.updateFrom(fetchedEvent);
            storedEvent.save();
          }
        }
      );
    });
  }

  async loadWebpage(): Promise<any> {
    const response = await axios.get(this.sourceURL);
    return response.data;
  }

  async extractDataFromWebpage(): Promise<any> {
    const $ = cheerio.load(await this.loadWebpage());
    const script = $("script").last().html();
    if (!script) return [];
    const json = script
      .replace("\n", "")
      .replace("(function(){const events = ", "")
      .replace("window.events = events;", "")
      .replace("})();", "")
      .trim();

    return json ? (cleanAndParseJSON(json) ?? []) : [];
  }

  convertDataToEvent(data: any): Event {
    const event = Event.build({
      sourceId: data._id,
      title: data.title,
      start: moment(data.date.startDate),
      end: moment(data.date.endDate),
      isAllDay: !!data.allDay,
      location: data.location,
      description: data.description,
      hosts: [this.sourceOrg],
      link: this.sourceURL + "/?event=" + data._id,
      sourceTitle: data.title,
      sourceOrg: this.sourceOrg,
      creationDate: moment(data._createdAt),
      lastModified: moment(data._createdAt),
    });
    return event.normalize();
  }
}
