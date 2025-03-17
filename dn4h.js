require("dotenv").config();
const os = require("os");
const moment = require('moment');
const ActionNetworkEventScraper = require('./ActionNetworkEventScraper.js');
const TeamUpCalendar = require('./TeamUpCalendar.js');

/////////////////////////////////////////////////////
/** Configuration for Dallas Neighbors for Housing */
const actionNetworkUrl = 'https://actionnetwork.org/groups/dallas-neighbors-for-housing';
const actionNetworkCacheTTL = 2; // hours
const teamupMainCalendarId = process.env.TEAMUP_DALLAS_URBANISTS_COMMUNITY_CALENDAR_MODIFIABLE_ID;
const teamupSubcalendarId = '14173954';
const teamupCacheTTL = 1; // hours
const minWaitSeconds = process.env.MIN_WAIT_SECONDS ?? 2;
const maxWaitSeconds = process.env.MAX_WAIT_SECONDS ?? 5;
/////////////////////////////////////////////////////

const actionNetwork = new ActionNetworkEventScraper(actionNetworkUrl);
actionNetwork.ttl = actionNetworkCacheTTL;
const teamup = new TeamUpCalendar(process.env.TEAMUP_APIKEY, teamupMainCalendarId, teamupSubcalendarId);
teamup.ttl = teamupCacheTTL;

async function main() {
  const logs = [];
  const log = (m, d) => { console.log(m, d); logs.push({ message: m, data: d }); };  
  const actionEvents = await actionNetwork.fetchEventList();
  const eventsMissingFromTeamup = [];
  
  for (let actionEvent of actionEvents) {
    if (await actionNetwork.needsToFetch(actionEvent)) {
      await actionNetwork.waitRandomSeconds(minWaitSeconds, maxWaitSeconds);
    } else {
      log(`${actionEvent.title} already cached. No need to wait few seconds`);
    }
    const eventDetails = await actionNetwork.fetchEventDetails(actionEvent);
    const eventIsSearchable = eventDetails.title && eventDetails.startDate;
    const eventIsRecent = eventDetails.startDate && moment(eventDetails.startDate).isSameOrAfter(moment().subtract(3, 'months'));
    if (eventIsSearchable && eventIsRecent) {
      if (null === await teamup.findEvent(eventDetails.title, eventDetails.startDate)) {
        log('Upcoming event listed on Action Network does not exist yet in TeamUp and needs to be created:', eventDetails.title);
        eventsMissingFromTeamup.push(eventDetails);
      }
    }
    // When an event is unsearchable, that probably means Action Network has blocked our access
    // in which case, we want to stop further requests.
    if (!eventIsSearchable) break;
  }
 
  for (let actionEvent of eventsMissingFromTeamup) {
    const newTeamUpEvent = await teamup.postEvent({
      who: 'Dallas Neighbors for Housing',
      custom: {
        signup_link: actionEvent.link
      },
      title: actionEvent.title,
      start_dt: actionEvent.startDate,
      end_dt: actionEvent.endDate,
      notes: actionEvent.link + os.EOL + actionEvent.description,
      location: actionEvent.location,
      all_day: actionEvent.allDay,
    });
    log('New event created on TeamUp:', newTeamUpEvent);
  }

  log('Sync finished.');

  return logs;
}

module.exports = main;