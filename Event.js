const moment = require('moment');
const _ = require('lodash');
const { getSimilarityPercentage } = require('./utilities.js');

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
   * @param {string|null} [options.id] - A unique identifier for the event.
   * @param {string} [options.description] - A description of the event.
   * @param {string|null} [options.link] - A link associated with the event.
   * @param {boolean} [options.isAllDay=false] - Whether the event lasts all day.
   * @param {string|string[]} [options.hosts] - The hosts of the event.
   */
  constructor(title, start, options={}) {
    this.title = title;
    this.start = moment(start);
    this.end = options.end ?? Event.defaultEnd(this.start);
    this.location = options.location ?? DEFAULT_LOCATION;
    this.id = options.id ?? null;
    this.description = options.description ?? '';
    this.link = options.link ?? null;
    this.isAllDay = !!options.isAllDay;
    this.hosts = options.hosts ? Event.deserializeHosts(options.host) : [];
    
    if (this.isAllDay) {
      this.start.startOf('day');
      this.end.endOf('day');
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
    const title = (e) => e.title.replace(/\[.*?\]\s*/g, '').trim(); 
  
    // Use higher or lower similarity threshold based on how many hours apart the two events are
    const hourDifference = Math.abs(this.start.diff(otherEvent.start, 'h'));
    const titleSimilarity = getSimilarityPercentage(title(this), title(otherEvent));
    const similarityThreshold = hourDifference <= SIMILARITY_HOUR_THRESHOLD
      ? SIMILARITY_TITLE_THRESHOLD_LOW
      : SIMILARITY_TITLE_THRESHOLD_HIGH;

    return titleSimilarity >= similarityThreshold;
  }

  /**
   * Translates the event into a format compatible with the Teamup API.
   * @param {string|string[]} subCalendarId - The subcalendar ID(s) to associate with the event.
   * @returns {Object} - The translated event object.
   */
  translateForTeamup(subCalendarId) {
    return {
      title: this.title,
      remote_id: this.id ?? null,
      start_dt: this.start.format(),
      end_dt: this.end.format(),
      who: Event.deserializeHosts(this.host),
      notes: this.description,
      location: this.location,
      all_day: this.isAllDay,
      subcalendar_ids: _.isArray(subCalendarId) ? subCalendarId : [subCalendarId],
      custom: { signup_link: this.link },
    };
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