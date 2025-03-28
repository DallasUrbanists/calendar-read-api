import ChannelInterface from "../Channels/ChannelInterface";
import Event, { initEventModel } from "../Models/Event";
import SourceInterface from "./SourceInterface";
import axios from "axios";
import moment from "moment";
import { cleanAndParseJSON } from "../utilities";
import * as cheerio from "cheerio";
import { eventIsRelevant } from "../Storage/cutoff-for-old-events";

export class DallasBicycleCoalition implements SourceInterface {
  public channel: ChannelInterface;
  public events: Event[] = [];
  
  constructor() {
    this.channel = new DBCWebsite(
      'https://dallasbicyclecoalition.org/calendar',
      'Dallas Bicycle Coalition'
    );
  }
  
  async updateStore(): Promise<void> {
    return this.channel.updateDatabase();
  }
  
  async getStoredEvents(): Promise<Event[]> {
    return await this.channel.getEventsFromStore();
  }
}

class DBCWebsite implements ChannelInterface {
  constructor(
    public sourceURL:string,
    public sourceOrg:string
  ) {
    this.sourceURL = sourceURL;
    this.sourceOrg = sourceOrg;
    initEventModel();
  }

  async getEventsFromStore(): Promise<Event[]> {
    return [];
  }
  
  async updateDatabase(): Promise<void> {
    const extractedData = await this.extractDataFromWebpage();
    const fetchedEvents = extractedData.map(this.convertDataToEvent, this);

    // For each event, either create new record in database or update existing
    fetchedEvents.filter(eventIsRelevant).forEach((fetchedEvent:Event) => {
      Event
        .findOne({ where: { sourceId: fetchedEvent.sourceId } })
        .then(storedEvent => {
          // If we could not find a stored event, then insert into database
          // by storing fetched event directly in database
          if (!storedEvent) {
            fetchedEvent.save();
          // Otherwise, update the existing stored event with data in new event
          } else {
            storedEvent.updateFrom(fetchedEvent);
            storedEvent.save();
          }
        });
    });

  }

  async loadWebpage(): Promise<any> {
    const response = await axios.get(this.sourceURL);
    return response.data;
  }

  async extractDataFromWebpage(): Promise<any> {
    const $ = cheerio.load(await this.loadWebpage());
    const script = $('script').last().html();
    if (!script) return [];
    const json = script
      .replace('\n', '')
      .replace('(function(){const events = ', '')
      .replace('window.events = events;', '')
      .replace('})();', '')
      .trim();

    if (json) {
      return cleanAndParseJSON(json) ?? [];
    }

    return [];
  }
  
  async fetchSourceEvents(): Promise<any> {    
    return await this.extractDataFromWebpage();
  }

  convertDataToEvent(data:any): Event {
    const event = Event.build({
      sourceId: data._id,
      title: data.title,
      start: moment(data.date.startDate),
      end: moment(data.date.endDate),
      isAllDay: !!data.allDay,
      location: data.location,
      description: data.description,
      hosts: [ this.sourceOrg ],
      link: this.sourceURL + '/?event=' + data._id,
      sourceTitle: data.title,
      sourceOrg: this.sourceOrg,
      creationDate: moment(data._createdAt),
      lastModified: moment (data._createdAt)
    });
    return event.normalize();
  }
}

async function main() {
  const DBC = new DallasBicycleCoalition();
  DBC.channel.updateDatabase();
}

main();