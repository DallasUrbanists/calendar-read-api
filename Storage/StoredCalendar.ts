require("dotenv").config();

import Event, { TeamupData, initEventModel, sortByAuthority } from "../Models/Event";
import { StorageInterface } from "./StorageInterface";
import { Op } from "sequelize";
import _ from "lodash";
import axios from "axios";
import { polyRead, waitRandomSeconds } from "../utilities";

const HEADERS = {
  'Content-Type': 'application/json',
  Accept: 'application/json, text/html',
  'Teamup-Token': 'fa68b6f0d704a55141e7ba70b0497ddec7852b815ce24df37d8c19482f308f01',
};

export class StoredCalendar implements StorageInterface {
  // Cached results of groomable() method
  private static groomableEvents: Event[] = [];

  // Cached results of groom() method
  private static groomedEvents: Event[] = [];

  static async groomable(): Promise<Event[]> {
    if (StoredCalendar.groomableEvents.length === 0) {
      this.groomableEvents = (await Event.findAll()).filter(e=>e.isGroomable());
    }
    return this.groomableEvents;
  }

  static async groom(): Promise<Event[]> {
    initEventModel();

    // If we've already groomed, return cached results
    // instead of executing this expensive operation
    if (StoredCalendar.groomedEvents.length > 0) {
      console.log(`Re-using cache of ${StoredCalendar.groomedEvents.length} groomed events.`);
      return this.groomedEvents;
    }

    // First, get all stored, groomable events
    const events = await StoredCalendar.groomable();

    console.log(`There are a total of ${events.length} events to groom.`);
    
    // let's keep track of which events we've already groomed
    const groomedEventIds: number[] = [];

    // This will be a unique set of events. When an event has siblings,
    // only one sibling will be used
    const groomedEvents: Event[] = [];
        
    // Begin grooming every event
    for (let event of events) {
      // Skip events we've already groomed it
      if (event.id && groomedEventIds.includes(event.id)) {
        continue;
      }

      // Normalize event details. This probably would have happened already
      // but invoking it here just to be safe.
      event.normalize();
      
      // Find all sibling events...
      // ...based on the event.siblingSourceIds array property
      const knownSiblings = await Event.findAll({ where: {
        sourceId: { [Op.in]: event.siblingSourceIds },
        // Avoid overlap with event itself
        id: { [Op.not]: event.id },
      }});
      // ...or based on how very similar they are
      const foundSiblings = (await Event.findAll({ where: {
        // Starts on the same day
        start: {
          [Op.between]: [event.start.startOf('day'), event.start.endOf('day')]
        },
        // Same value for isAllDay
        isAllDay: event.isAllDay,
        // Either has no canonical source or has same canonical source
        [Op.or]: [
          { canonSourceId: { [Op.is]: null } },
          { canonSourceId: event.canonSourceId },
        ],
        // Avoid overlap with known siblings
        sourceId: { [Op.notIn]: event.siblingSourceIds },
        // Avoid overlap with event itself
        id: { [Op.not]: event.id },
      }})).filter((sibling: Event) => event.isProbablySameAs(sibling));
      const siblings = _.uniq(_.concat(knownSiblings, foundSiblings));
      
      // Normalize and cross-fill data across all siblings
      event.siblingSourceIds = _.uniq(siblings.map(s=>s.sourceId??'').filter(id=>id!==''));
      for (let sibling of siblings) {
        sibling.normalize().crossUpdateWith(event);
        sibling.save();
      }
      event.save();

      // Remember that we've groomed this event + siblings
      const family = _.flatten([event, siblings]);
      groomedEventIds.push(...(family.map(e=>e.id)));

      // Among all sibling events, only push the event with highest authority
      groomedEvents.push(sortByAuthority(family)[0]);
    }

    // Cache results
    StoredCalendar.groomedEvents = groomedEvents;

    console.log(`We now have ${groomedEvents.length} groomed events.`);

    // Return the final array of groomed events
    return groomedEvents;
  }
}

type teamupRequest = {
  event: Event,
  request: {
    method: 'GET' | 'POST' | 'PUT',
    url: string,
    params: any,
    data: TeamupData,
    headers: any  
  }
};

export const subcalendarIndex = {
  "Urbanism": "14211126",
  "Housing": "14211119",
  "Public Transit": "14216526",
  "Cycling": "14211118"
};

async function main(): Promise<void> {
  // All these events are expected to be in TeamUp
  const groomedEvents = await StoredCalendar.groom();

  // Of those events, these events have not been synced with TeamUp
  const unsyncedEvents = groomedEvents.filter(event => event.teamupId === null);

  // Conversely, these events have been synced with TeamUp
  // const syncedEvents = groomedEvents.filter(event => event.teamupId !== null);

  // This is the queue of API calls to send to TeamUp
  const teamupQueue: teamupRequest[] = [];

  // Define the calendar that we are about to add to
  const teamupMainCalendar = 'ks8fsg4pwt4gy9va6x';

  // For each unsynced event, add a request to create that event in TeamUp
  unsyncedEvents.forEach((event:Event) => {
    const subcalendars = event.categories.map(c => polyRead(subcalendarIndex, c));
    if (subcalendars.length === 0) {
      console.log(`No subcalendars for ${event.title}. `, event.teamup?.subCalendars);
      return;
    }
    event.teamup = {
      mainCalendar: teamupMainCalendar,
      subCalendars: subcalendars
    };
    teamupQueue.push({
      event,
      request: {
        method: 'POST',
        params: {format: 'html'},
        url: `https://api.teamup.com/${event.teamup?.mainCalendar}/events`,
        data: event.asTeamupData(),
        headers: HEADERS  
      }
    })
  });

  // Process each request to TeamUp
  for (let request of teamupQueue) {
    try {
      console.log('POST to subcalendars: ', request.event.teamup?.subCalendars);
      const { data } = await axios.request(request.request);
      if (data?.event) {
        console.log(`POST "${request.event.title}" and got back Teamup ID ${data.event.id}`);
        request.event.teamupId = data.event.id;
        request.event.save();
        await waitRandomSeconds(2, 5);
      } else {
        console.log(`Something went wrong with POST "${request.event.title}"`);
        console.log(data);
        console.log(request.request);
        return;
      }
    } catch (e:any) {
      console.error(e.response.data);
      console.log(request.request);
      return;
    }
  }
}

main();
