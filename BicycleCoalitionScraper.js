const cheerio = require('cheerio');
const moment = require('moment');
const _ = require('lodash');
const EventScraper = require('./EventScraper.js');
const TeamUpCalendar = require('./TeamUpCalendar.js');

/////////////////////////////////////////////////////
/** Configuration for Dallas Neighbors for Housing */
const calendarWebpageURL = 'https://dallasbicyclecoalition.org/calendar';
const calendarWebpageTTl = 1; // hours
const teamupMainCalendarId = process.env.TEAMUP_DALLAS_URBANISTS_COMMUNITY_CALENDAR_MODIFIABLE_ID;
const teamupSubcalendarId = '14179266'; // Transportation Subcalendar
const teamupCacheTTL = 1; // hours
const minWaitSeconds = process.env.MIN_WAIT_SECONDS ?? 2;
const maxWaitSeconds = process.env.MAX_WAIT_SECONDS ?? 5;
/////////////////////////////////////////////////////

const postLimit = 50;

class BicycleCoalitionScraper extends EventScraper {
  constructor() {
    super();
    this.sourceURL = calendarWebpageURL;
    this.teamup = new TeamUpCalendar(
      process.env.TEAMUP_APIKEY,
      teamupMainCalendarId,
      teamupSubcalendarId
    );
  }
  
  async fetchSourceEvents() {
    if (!this.sourceEvents) {
      const $ = cheerio.load(await this.fetchURL(this.sourceURL));
      this.sourceEvents = cleanAndParseJSON(
        $('script')
        .last()
        .html()
        .replace('\n', '')
        .replace('(function(){const events = ', '')
        .replace('window.events = events;', '')
        .replace('})();', '')
        .trim()
      );
    }
    
    return this.sourceEvents;
  }
  
  async fetchTeamupEvents() {
    if (!this.teamupEvents) {
      this.teamupEvents = await this.teamup.fetchEvents();
    }
    
    return this.teamupEvents;
  }
  
  async discoverEventsToSync() {
    const sourceEvents = await this.fetchSourceEvents();
    const teamupEvents = await this.fetchTeamupEvents();
    const isAfterSearchStart = (date) => moment(date).isAfter(this.teamup.startSearchDate);
    const isBeforeSearchEnd = (date) => moment(date).isBefore(this.teamup.endSearchDate);
    
    return sourceEvents
      .filter(({date}) => isAfterSearchStart(date.startDate) && isBeforeSearchEnd(date.startDate))
      .filter(sourceEvent => {
        for (let teamupEvent in teamupEvents) {
          if (
            (_.upperCase(teamupEvent.title) === _.upperCase(sourceEvent.title)) &&
            (moment(teamupEvent.start_dt).isSame(sourceEvent.startDate, 'day'))
          ) {
            console.log(`Found ${sourceEvent.title} already in TeamUp.`);
            return false;
          }
        }
        return true;
      })
    ;
  }


  async sendUpdatesToTeamup() {
    const eventsToSync = await this.discoverEventsToSync();
    const sentEvents = [];
    let counter = 0;

    for (let event of eventsToSync) {
      if (counter > postLimit) {
        break;
      }

      const startDate = event.date.startDate;
      const endDate = _.defaultTo(event.date.endDate, startDate);

      this.teamup.postEvent({
        who: 'Dallas Bicycle Coalition',
        title: event.title,
        start_dt: moment(startDate).format(),
        end_dt: moment(endDate).format(),
        notes: event.description,
        location: event.location,
        all_day: event.allDay === true,
        remote_id: event._id
      }).then(sentEvents.push);

      counter += 1;
    }

    return sentEvents;
  }
}

const dbc = new BicycleCoalitionScraper();
dbc.sendUpdatesToTeamup();

function cleanAndParseJSON(rawText) {
  try {
    // Step 1: Trim whitespace
    let cleanedText = rawText.trim();
    
    // Step 2: Extract the valid JSON block using regex
    const jsonMatch = cleanedText.match(/({.*}|\[.*\])/s);
    if (!jsonMatch) {
      throw new Error("No valid JSON found in the input.");
    }
    
    cleanedText = jsonMatch[0]; // Extract the JSON-like structure
    
    // Step 3: Remove non-printable control characters (except valid whitespace)
    cleanedText = cleanedText.replace(/[\u0000-\u001F\u007F-\u009F]/g, "");
    
    // Step 4: Fix trailing commas before closing braces and brackets
    cleanedText = cleanedText
    .replace(/,\s*}/g, "}")  // Remove trailing commas before }
    .replace(/,\s*]/g, "]"); // Remove trailing commas before ]
    
    // Step 5: Parse and return the cleaned JSON
    return JSON.parse(cleanedText);
  } catch (error) {
    console.error("Error parsing JSON:", error.message);
    return null;
  }
}