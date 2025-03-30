require("dotenv").config();

import Event, { initEventModel, sortByAuthority } from "../models/Event";
import { Op } from "sequelize";
import _ from "lodash";

export class StoredCalendar {
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
