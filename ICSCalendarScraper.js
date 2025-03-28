const axios = require('axios');
const ical = require('ical');

/**
* Fetches an ICS calendar file from a URL and parses it into a JSON array of events.
* @param {string} url - The URL of the ICS calendar feed.
* @returns {Promise<Array>} - A promise that resolves to an array of event objects.
*/
async function fetchAndParseICS(url) {
  try {
    const response = await axios.get(url, { responseType: 'text' });
    const icsData = response.data;
    const parsedData = ical.parseICS(icsData);
    
    const events = Object.values(parsedData)
    .filter(event => event.type === "VEVENT") // Extract only events
    .map(event => ({
      uid: event.uid,
      title: event.summary || "No Title",
      description: event.description || "",
      location: event.location || "No Location",
      start: event.start.toISOString(),
      end: event.end ? event.end.toISOString() : null,
      allDay: event.datetype === "date",
      organizer: event.organizer || "",
      attendees: event.attendee ? [].concat(event.attendee) : [],
    }));
    
    return events;
  } catch (error) {
    console.error("Error fetching or parsing ICS:", error);
    return [];
  }
}

module.exports = fetchAndParseICS;

// TEST 
const dataURL = 'https://calendar.google.com/calendar/ical/c_b84185fb0c5798bfc8d926ac5013d4ed1fdbd0c3fb79a960686fbb9250037595%40group.calendar.google.com/public/basic.ics';
fetchAndParseICS(dataURL).then(console.log);