import axios from "axios";
import * as cheerio from "cheerio";
import moment from "moment";
import Event, { initEventModel } from "../models/Event";
import { cleanAndParseJSON, eventIsRelevant } from "../utilities";
import _ from "lodash";

export class DBCWebsiteScraper {
  private static dataKeys: string[] = [];

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
            const lastModified = fetchedEvent.lastModified;
            storedEvent.updateFrom(fetchedEvent);
            // We should always respect the last modified date according to source
            storedEvent.lastModified = lastModified;
            storedEvent.save();
          }
        }
      );
    });
  }

  async loadWebpage(): Promise<any> {
    const response = await axios.get(this.sourceURL, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:136.0) Gecko/20100101 Firefox/136.0",
        "Referer": "https://dallasurbanists.com",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.5",
        "Accept-Encoding": "gzip, deflate, br, zstd",
        "Connection": "close",
        "Upgrade-Insecure-Requests": 1,
        "Sec-Fetch-Dest": "document",
        "Sec-Fetch-Mode": "navigate",
        "Sec-Fetch-Site": "none",
        "Sec-Fetch-User": "?1",
        "DNT": 1,
        "Sec-GPC": 1,
        "Priority": "u=0, i"
      }
    });
    console.log(response.data);
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
