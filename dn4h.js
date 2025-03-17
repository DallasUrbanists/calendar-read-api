require("dotenv").config();
const moment = require('moment');
const ActionNetworkEventScraper = require('./ActionNetworkEventScraper.js');
const TeamUpCalendar = require('./TeamUpCalendar.js');

/////////////////////////////////////////////////////
/** Configuration for Dallas Neighbors for Housing */
const actionNetworkUrl = 'https://actionnetwork.org/groups/dallas-neighbors-for-housing';
const actionNetworkCacheTTL = 2;
const teamupMainCalendarId = process.env.TEAMUP_DALLAS_URBANISTS_COMMUNITY_CALENDAR_MODIFIABLE_ID;
const teamupSubcalendarId = '14173954';
const minWaitSeconds = process.env.MIN_WAIT_SECONDS ?? 2;
const maxWaitSeconds = process.env.MAX_WAIT_SECONDS ?? 5;
/////////////////////////////////////////////////////

const actionNetwork = new ActionNetworkEventScraper(actionNetworkUrl);
actionNetwork.ttl = actionNetworkCacheTTL;
const teamup = new TeamUpCalendar(process.env.TEAMUP_APIKEY, teamupMainCalendarId, teamupSubcalendarId);

async function main() {
  const logs = [];
  const log = (m, d) => { console.log(m, d); logs.push({ message: m, data: d }); };  
  const actionEvents = await actionNetwork.fetchEventList();
  const eventsMissingFromTeamup = [];
  
  for (let actionEvent of actionEvents) {
    await actionNetwork.waitRandomSeconds(minWaitSeconds, maxWaitSeconds);
    const eventDetails = await actionNetwork.fetchEventDetails(actionEvent);
    const eventIsSearchable = eventDetails.title && eventDetails.startDate;
    const eventIsUpcoming = eventDetails.startDate && moment(eventDetails.startDate).isSameOrAfter(moment());
    if (eventIsSearchable && eventIsUpcoming) {
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
      start_dt: actionEvent.startDate,
      end_dt: actionEvent.endDate,
      title: actionEvent.title,
      notes: actionEvent.description,
      location: actionEvent.location,
      all_day: actionEvent.allDay,
    });
    log('New event created on TeamUp:', newTeamUpEvent);
  }

  log('Sync finished.');
  log('Events found from Action Network:', actionEvents);
  log('Events missing from TeamUp:', eventsMissingFromTeamup);

  return logs;
}

module.exports = main;