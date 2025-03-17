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

const sampleEvent = {
  link: 'https://actionnetwork.org/events/housing-bills-at-the-texas-legislature',
  img: 'https://can2-prod.s3.amazonaws.com/events/photos/002/046/892/thumb/1.png',
  title: 'Housing Bills at the Texas Legislature'
};

actionNetwork.fetchEventList().then(actionEvents => {
  console.log(actionEvents);
  /*actionEvents.forEach(async event => {
    const actionEvent = await actionNetwork.fetchEventDetails(event);
    console.log(actionEvent);
  });*/
});


/*actionNetwork.fetchEventList().then(actionEvents => {
  teamup.fetchEvents().then(teamupEvents => {

  });
});*/







//const teamupEvents = await teamup.fetchEvents();
//const teamupTitles = teamupEvents.map(event => event.title);

// Events that exist in Action Network but not in TeamUp
/*const newEvents = actnetEvents.filter(event => !teamupTitles.includes(event.title)).map(event => {
  return {
    title: event.title,
    link: event.link,
    img: event.img
  };
});*/

