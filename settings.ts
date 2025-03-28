export const MAX_DAYS_IN_PAST = 180;
export const subcalendarIndex = {
  "Urbanism": "14211126",
  "Housing": "14211119",
  "Public Transit": "14216526",
  "Cycling": "14211118"
};
export const DEFAULT_DURATION = [1, 'hours']; // This is used when an event does not specify an end date. 
export const HOSTS_LIST_DELIMITER = ' + '; // This is used to separate multiple event hosts in a list.
export const SIMILARITY_HOUR_THRESHOLD = 2; // If two events start within threshold, compare title similarity based on lower threshold.
export const SIMILARITY_TITLE_THRESHOLD_HIGH = 0.7; // Used to determine if two events (on the same day) are probably the same.
export const SIMILARITY_TITLE_THRESHOLD_MID = 0.51; // Used to determine if two events (within hours of each other) are probably the same.
export const SIMILARITY_TITLE_THRESHOLD_LOW = 0.20; // Used to determine if two events (at same location) are probably the same.

export const TEAMUP_MAIN_CALENDAR = 'ks8fsg4pwt4gy9va6x';
export const TEAMUP_API_HEADERS = {
  'Content-Type': 'application/json',
  Accept: 'application/json, text/html',
  'Teamup-Token': process.env.TEAMUP_APIKEY,
};

