const moment = require('moment');
const _ = require('lodash');
const organizations = require('./organizations.json');
const TeamupAPI = require('./TeamupAPI.js');
const {
  getSimilarityPercentage,
  fuzzyMatch,
  parseBrackets,
  removeBrackets
} = require('./utilities.js');

const DEFAULT_DURATION = [1, 'hours']; // This is used when an event does not specify an end date. 
const DEFAULT_LOCATION = 'Dallas, TX'; // This is used when an event does not specify a location.
const HOSTS_LIST_DELIMITER = ' + '; // This is used to separate multiple event hosts in a list.
const SIMILARITY_HOUR_THRESHOLD = 2; // If two events start within threshold, compare title similarity based on lower threshold.
const SIMILARITY_TITLE_THRESHOLD_LOW = 0.51; // Used to determine if two events (within hours of each other) are probably the same.
const SIMILARITY_TITLE_THRESHOLD_HIGH = 0.7; // Used to determine if two events (on the same day) are probably the same.

/**
 * Represents a calendar event with details such as title, start time, end time, location, and more.
 */
class Event {
  /**
   * Creates an instance of Event.
   * @param {string} title - The title of the event.
   * @param {string|Date|moment.Moment} start - The start time of the event.
   * @param {Object} [options={}] - Additional options for the event.
   * @param {string|Date|moment.Moment} [options.end] - The end time of the event.
   * @param {string} [options.location] - The location of the event.
   * @param {string|null} [options.id] - A unique identifier for the event from its original source. Matches teamupId if TeamUp is the event source.
   * @param {string|null} [options.teamupId] - A unique identifier for the event from TeamUp calendar.
   * @param {string} [options.description] - A description of the event.
   * @param {string|null} [options.link] - A link associated with the event.
   * @param {boolean} [options.isAllDay=false] - Whether the event lasts all day.
   * @param {string|string[]} [options.hosts] - The hosts of the event.
   */
  constructor(title, start, options={}) {
    this.title = title;
    this.start = moment(start);
    this.end = options.end ?? Event.defaultEnd(this.start);
    this.id = options.id ?? options.teamupId ?? null;
    this.teamupId = options.teamupId ?? null;
    this.location = options.location ?? DEFAULT_LOCATION;
    this.description = options.description ?? '';
    this.link = options.link ?? null;
    this.isAllDay = !!options.isAllDay;
    this.hosts = options.hosts ? Event.deserializeHosts(options.hosts) : [];
    
    if (this.isAllDay) {
      this.start.startOf('day');
      this.end.endOf('day');
    }

    this.api = new TeamupAPI();

    if (options.subCalendarId) {
      this.api.setSubCalendar(options.subCalendarId);
    }
  }

  /**
   * Determines if the current event is probably the same as another event.
   * @param {Event} otherEvent - The event to compare against.
   * @returns {boolean} - True if the events are probably the same, false otherwise.
   */
  isProbablySameAs(otherEvent) {
    // If events have identical IDs, consider them the same  
    if (this.id !== null && this.id === otherEvent.id) {
      return true;
    }

    // If events don't start on the same day, we won't consider them the same
    if (!this.start.isSame(otherEvent, 'day')) {
      return false;
    }

    // Helper method: remove any text in square brackes from titles before comparing
    // This is because it's common for duplicate events to have org name in brackets
    // e.g. "[Dallas Neighbors for Housing] Housing Bills in Texas Legislature"
    const title = (e) => removeBrackets(e.title);
  
    // Use higher or lower similarity threshold based on how many hours apart the two events are
    const hourDifference = Math.abs(this.start.diff(otherEvent.start, 'h'));
    const titleSimilarity = getSimilarityPercentage(title(this), title(otherEvent));
    const similarityThreshold = hourDifference <= SIMILARITY_HOUR_THRESHOLD
      ? SIMILARITY_TITLE_THRESHOLD_LOW
      : SIMILARITY_TITLE_THRESHOLD_HIGH;

    return titleSimilarity >= similarityThreshold;
  }

  /**
   * Normalizes the event by cleaning up the title and organizing the hosts.
   * 
   * @description
   * - Extracts organization names from square brackets in the title and adds them to the `hosts` array.
   * - Cleans up the title by removing square brackets and their contents.
   * - Replaces aliases and misspellings in the `hosts` array with the official organization names.
   * - Ensures the `hosts` array contains only unique and non-empty values.
   * 
   * @returns {Event} - The normalized event instance.
   */
  normalize() {
    // Sometimes people put the organization name in the event title with square brackets.
    // If they've done so, let's move the organization name from the title to the hosts property
    const titleBrackets = parseBrackets(this.title);
    if (titleBrackets.length > 0) {
      // Because we can't enforce a standard practice of one org name per pair of square brackets
      // Detect when multiple org names share a pair of square brackets based on use of special characters
      const titleOrgs = _.flatten(titleBrackets.map(b => b.split(/[;,+&]/).map(s => s.trim()).filter(s => s !== "")));

      // Now add these organizations to the hosts array
      this.hosts = [...new Set([...this.hosts, ...titleOrgs])];

      // Now that we've captured the hosts in the correct property,
      // We can remove them from the title to clean it up
      this.title = removeBrackets(this.title);
    }

    // The spelling and alias of organization names are not always consistent.
    // In the hosts array, replace aliases and misspellings with the org's official name
    this.hosts = this.hosts.map(host => {
      const match = organizations.find(org => 
        fuzzyMatch(org.name, host) ||
        org.aliases.some(alias => fuzzyMatch(alias, host))
      );
      return (match ? match.name : host).trim();
    }).filter(h=>h!=='');

    // Remove duplicates from hosts array
    this.hosts = [...new Set(this.hosts)];

    return this;
  }

  /**
   * Translates the event into a format compatible with the Teamup API.
   * @param {string|string[]} subCalendarId - The subcalendar ID(s) to associate with the event.
   * @returns {Object} - The translated event object.
   */
  translateForTeamup() {
    return {
      id: this.teamupId,
      title: this.title,
      remote_id: this.id ?? null,
      start_dt: this.start.format(),
      end_dt: this.end.format(),
      who: Event.serializeHosts(this.hosts),
      notes: this.description,
      location: this.location,
      all_day: this.isAllDay,
      subcalendar_ids: [this.api.subCalendarId],
      custom: { signup_link: this.link },
    };
  }

  static translateFromTeamup(data) {
    return new Event(
      data.title,
      data.start_dt,
      {
        end: data.end,
        location: data.location,
        id: data.remote_id,
        teamupId: data.id,
        description: data.notes,
        link: data.custom?.signup_link,
        isAllDay: data.all_day,
        hosts: Event.deserializeHosts(data.who),
      }
    );
  }

  async pullFromTeamUp() {
    return await this.api.search(this);
  }

  async combineFromTeamup() {
    if (await this.existsInTeamup()) {
      console.log('combine - exists in teamup');
      const teamupData = await this.pullFromTeamUp();
      const teamupEvent = Event.translateFromTeamup(teamupData);
      this.combineDetailsFrom(teamupEvent, false);
      this.teamupId = teamupEvent.id;
    }

    return this;
  }

  async updateInTeamup() {
    if (!(await this.existsInTeamup())) {
      console.error('Cannot update this event because it does not exist in Teamup yet.');
      return false;
    }

    return await this.api.update(this);
  }

  async postInTeamup() {
    if ((await this.existsInTeamup()) === true) {
      console.error('Cannot create this event because it already exists in Teamup.');
      return false;
    }

    const response = await this.api.post(this);
    this.teamupId = response.teamupId;
    this.combineDetailsFrom(Event.translateFromTeamup(response));
    return this;
  }

  async existsInTeamup() {
    const teamupId = await this.getTeamupId();
    console.log(teamupId);
    return !!teamupId;
  }

  async getTeamupId() {
    if (this.teamupId) {
      return this.teamupId;
    }

    console.log('teamup id', this.teamupId);
    const teamupData = await this.pullFromTeamUp();
    console.log('teamup data', teamupData);
    if (teamupData) {
      this.teamupId = teamupData.id;
      return this.teamupId;
    }

    return null;
  }

  /**
   * Combines details from another event into the current event.
   * 
   * @param {Event} otherEvent - The event to merge details from.
   * @param {boolean} [overwrite=true] - Whether to overwrite existing details in the current event.
   * 
   * @description
   * - If `overwrite` is `true`, the title, start time, end time, and all-day status of the current event
   *   will be replaced with those from `otherEvent`.
   * - The `id`, `link`, and `description` properties will only be updated if they are not already set in the current event.
   * - The `location` will only be updated if the current location is the default location or if the new location
   *   is meaningfully different.
   * - The `hosts` arrays from both events will be combined into a unique list.
   */
  combineDetailsFrom(otherEvent, overwrite = true) {
    if (overwrite === true) {
      this.title = otherEvent.title;
      this.start = otherEvent.start;
      this.end = otherEvent.end;
      this.isAllDay = otherEvent.isAllDay;
    }

    this.id = otherEvent.id ?? this.id;
    this.link = otherEvent.link ?? this.link;    
    this.description = otherEvent.description ?? this.description;

    // Only overwrite location if new location is meaningfully different
    const thisLocationIsDefault = fuzzyMatch(this.location, DEFAULT_LOCATION);
    const otherLocationIsDefault = fuzzyMatch(otherEvent.location, DEFAULT_LOCATION);
    if (thisLocationIsDefault || !otherLocationIsDefault) {
      this.location = otherEvent.location;
    }

    // Combine hosts into a unique array
    this.hosts = [...new Set([...this.hosts, ...otherEvent.hosts])];
  }

  /**
   * Calculates the default end time for an event based on its start time.
   * @param {moment.Moment} start - The start time of the event.
   * @returns {moment.Moment} - The default end time.
   */
  static defaultEnd(start) {
    return start.clone().add(...DEFAULT_DURATION);
  }

  /**
   * Serializes a list of hosts into a single string.
   * @param {string|string[]} hosts - The hosts to serialize.
   * @returns {string} - The serialized hosts string.
   */
  static serializeHosts(hosts) {
    if (_.isArray(hosts)) {
      return hosts.map(s=>s.trim()).join(HOSTS_LIST_DELIMITER);
    }
    return _.toString(hosts).trim();
  }

  /**
   * Deserializes a string of hosts into an array of individual hosts.
   * @param {string|string[]} hosts - The hosts to deserialize.
   * @returns {string[]} - The deserialized array of hosts.
   */
  static deserializeHosts(hosts) {
    if (_.isArray(hosts)) {
      return hosts.map(s=>s.trim());
    }
    return _.toString(hosts).split(HOSTS_LIST_DELIMITER).map(s=>s.trim());
  }
}

module.exports = Event;