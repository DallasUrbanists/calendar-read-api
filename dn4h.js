const ActionNetworkEventScraper = require('./ActionNetworkEventScraper.js');
const TeamUpCalendar = require('./TeamUpCalendar.js');

const actionNetwork = new ActionNetworkEventScraper(
  'https://actionnetwork.org/groups/dallas-neighbors-for-housing'
);

const teamup = new TeamUpCalendar(
  'fa68b6f0d704a55141e7ba70b0497ddec7852b815ce24df37d8c19482f308f01',
  'ksz81tgvyy4hb9u9br',
  '14173954'
);

teamup.fetchEvents().then(teamupEvents => {
  actionNetwork.fetchEventList().then(async actionEvents => {
    const eventsToBeCreated = [];

    for (let event of actionEvents.slice(0, 3)) {
      await actionNetwork.waitRandomSeconds(1, 2);
      const eventDetails = await actionNetwork.fetchEventDetails(event);
      if (eventDetails.title && eventDetails.startDate) {
        const teamupEvent = await teamup.findEvent(eventDetails.title, eventDetails.startDate);
        if (teamupEvent) {
          console.log('Event found:', teamupEvent.title);
        } else {
          console.log('Event not found, needs to be created:', eventDetails.title);
          eventsToBeCreated.push(eventDetails);
        }
      } else {
        console.log('Event details from Action Network is missing either the title or the startDate', eventDetails);
      }
    }

    console.log(`${eventsToBeCreated.length} Events need to be created in TeamUp:`, eventsToBeCreated);

    for (let event of eventsToBeCreated) {
      const newTeamUpEvent = await teamup.postEvent({
        start_dt: event.startDate,
        end_dt: event.endDate,
        title: event.title,
        notes: event.description,
        location: event.location,
        all_day: event.allDay,
      });
      console.log('New event created on TeamUp:', newTeamUpEvent);
    }
  })
});