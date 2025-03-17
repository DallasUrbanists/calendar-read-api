const ActionNetworkEventScraper = require('./ActionNetworkEventScraper.js');
const TeamUpCalendar = require('./TeamUpCalendar.js');

const actionNetwork = new ActionNetworkEventScraper(
  'https://actionnetwork.org/groups/dallas-neighbors-for-housing'
);

const teamup = new TeamUpCalendar(
  'fa68b6f0d704a55141e7ba70b0497ddec7852b815ce24df37d8c19482f308f01',
  'kszxfmof4iyibgp1kn',
  '14173954'
);

actionNetwork.fetchEventList().then(async (actionEvents) => {
  for (let event of actionEvents) {
    await actionNetwork.waitRandomSeconds(2, 4);
    const eventDetails = await actionNetwork.fetchEventDetails(event);
    console.log(eventDetails);
  }
});