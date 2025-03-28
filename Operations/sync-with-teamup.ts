require("dotenv").config();
import axios from "axios";
import Event from "../Models/Event";
import { teamupRequest } from "../Scrapers/ScraperInterfaces";
import {
  subcalendarIndex,
  TEAMUP_API_HEADERS,
  TEAMUP_MAIN_CALENDAR,
} from "../settings";
import { StoredCalendar } from "./StoredCalendar";
import { polyRead, waitRandomSeconds } from "../utilities";

async function main() {
  // All these events are expected to be in TeamUp
  const groomedEvents = await StoredCalendar.groom();

  // Of those events, these events have not been synced with TeamUp
  const unsyncedEvents = groomedEvents.filter(
    (event) => event.teamupId === null
  );

  // This is the queue of API calls to send to TeamUp
  const teamupQueue: teamupRequest[] = [];

  // For each unsynced event, add a request to create that event in TeamUp
  unsyncedEvents.forEach((unsyncedEvent: Event) => {
    const subcalendars = unsyncedEvent.categories.map((c) =>
      polyRead(subcalendarIndex, c)
    );
    if (subcalendars.length === 0) {
      console.log(
        `No subcalendars for ${unsyncedEvent.title}. `,
        unsyncedEvent.teamup?.subCalendars
      );
      return;
    }
    unsyncedEvent.teamup = {
      mainCalendar: TEAMUP_MAIN_CALENDAR,
      subCalendars: subcalendars,
    };
    teamupQueue.push({
      event: unsyncedEvent,
      request: {
        method: "POST",
        params: { format: "html" },
        url: `https://api.teamup.com/${unsyncedEvent.teamup?.mainCalendar}/events`,
        data: unsyncedEvent.asTeamupData(),
        headers: TEAMUP_API_HEADERS,
      },
    });
  });

  console.log(`There are ${teamupQueue.length} items to sync with TeamUp`);

  // Process each request to TeamUp
  for (let request of teamupQueue) {
    try {
      console.log("POST to subcalendars: ", request.event.teamup?.subCalendars);
      const { data } = await axios.request(request.request);
      if (data?.event) {
        console.log(
          `POST "${request.event.title}" and got back Teamup ID ${data.event.id}`
        );
        request.event.teamupId = data.event.id;
        request.event.save();
        await waitRandomSeconds(2, 5);
      } else {
        console.log(`Something went wrong with POST "${request.event.title}"`);
        return;
      }
    } catch (e: any) {
      console.error(e.response.data);
      return;
    }
  }
}

main();