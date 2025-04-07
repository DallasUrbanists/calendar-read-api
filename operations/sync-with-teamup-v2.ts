import Event, { initEventModel, sortByAuthority } from "../models/Event";
import TeamupAPI from "../teamup/TeamupAPI";
import { waitRandomSeconds } from "../utilities";

initEventModel();

function groupEvents(events: Event[]): { [key: string]: Event[] } {
  const groupedEvents: { [key: string]: Event[] } = {};
  const groupedIds: number[] = [];

  for (const event of events) {
    if (groupedIds.includes(event.id)) continue;

    const siblings: Event[] = [event];
    for (const otherEvent of events) {
      if (event === otherEvent) continue;
      if (event.isProbablySameAs(otherEvent)) {
        siblings.push(otherEvent);
        groupedIds.push(otherEvent.id);
      }
    }
    groupedEvents[event.title] = siblings;
    groupedIds.push(event.id);
  }

  return groupedEvents;
}

function promoteCanonEvent(events: Event[]): Event {
  const canonEvent = sortByAuthority(events)[0];
  canonEvent.canonize();
  for (const siblingEvent of events) {
    if (canonEvent.id !== siblingEvent.id) {
      siblingEvent.canonSourceId = canonEvent.sourceId;
      canonEvent.crossUpdateWith(siblingEvent);
      siblingEvent.save();
    }
  }
  canonEvent.save();
  return canonEvent;
}

async function getTeamupStatusPerEvent(events: Event[]): Promise<any[]> {
  let results = [];

  for (const event of events) {
    const teamupData = event.teamupId
      ? await TeamupAPI.fetchEvent(event.teamupId)
      : await TeamupAPI.searchEvent(event);
    const teamupEvent = TeamupAPI.teamupDataToEvent(teamupData);

    let teamupStatus = "NO ACTION";
    let teamupLastModified = "";
    if (!TeamupAPI.isPostable(event)) {
      continue;
    }
    if (!event.teamupId && teamupData) {
      teamupStatus = `SELF UPDATE`;
      event.teamupId = teamupData.id;
    } else if (!event.teamupId && !teamupData) {
      teamupStatus = `NEED POST`;
    } else if (event.teamupId && teamupData) {
      teamupLastModified = teamupData.update_dt ?? teamupData.creation_dt;
      const eventIsNewer =
        !teamupLastModified || event.lastModified.isAfter(teamupLastModified);
      if (teamupEvent === null || eventIsNewer) {
        teamupStatus = `NEED UPDATE`;
      } else {
        teamupStatus = `NO ACTION`;
      }
    } else if (event.teamupId && !teamupData) {
      teamupStatus = `NO ACTION`;
    }

    results.push({
      event: event,
      eventLastModified: event.lastModified.format("YYYY-MM-DD HH:mm:ss"),
      teamupLastModified,
      teamupStatus: teamupStatus,
    });
  }

  return results;
}

Event.findAll({
  order: [
    ["start", "DESC"],
    ["title", "ASC"],
  ],
}).then(async (scrapedEvents) => {
  const storedEvents = scrapedEvents.map((e) => e.normalize());
  const groupedEvents = groupEvents(storedEvents);
  const canonEvents = Object.values(groupedEvents).map(promoteCanonEvent);
  const eventsWithTeamupStatus = await getTeamupStatusPerEvent(canonEvents);
  const results = {
    selfUpdate: 0,
    posted: 0,
    updated: 0,
    skipped: 0,
  };

  for (let eventWithStatus of eventsWithTeamupStatus) {
    const event = eventWithStatus.event;
    const status = eventWithStatus.teamupStatus;
    switch (status) {
      case "SELF UPDATE":
        console.log(`SELF UPDATE: ${event.title}`);
        results.selfUpdate++;
        event.save();
        break;
      case "NEED POST":
        console.log(`NEED POST: ${event.title}`);
        await TeamupAPI.postEvent(event);
        await waitRandomSeconds(1, 2);
        results.posted++;
        break;
      case "NEED UPDATE":
        console.log(`NEED UPDATE: ${event.title}`);
        await TeamupAPI.updateEvent(event);
        await waitRandomSeconds(1, 2);
        results.updated++;
        break;
      case "NO ACTION":
      default:
        console.log(`NO ACTION: ${event.title}`);
        results.skipped++;
        break;
    }
  }

  console.log(results);
});
