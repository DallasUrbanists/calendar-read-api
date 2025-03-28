type source = {
  org: string,
  url: string,
  platform:
  "action network" |
  "icalendar" |
  "dbc website"
};

const sources:source[] = [
  {
    org: "Dallas Neighbors for Housing",
    url: "https://actionnetwork.org/groups/dallas-neighbors-for-housing",
    platform: "action network"
  },
  {
    org: "Dallas Area Transit Alliance",
    url: "https://calendar.google.com/calendar/ical/c_b84185fb0c5798bfc8d926ac5013d4ed1fdbd0c3fb79a960686fbb9250037595%40group.calendar.google.com/public/basic.ics",
    platform: "icalendar"
  },
  {
    org: "Dallas Bicycle Coalition",
    url: "https://dallasbicyclecoalition.org/calendar",
    platform: "dbc website"
  },
  {
    org: "Dallas Urbanists STLC",
    url: "https://www.meetup.com/dallas-urbanists/events/ical/",
    platform: "icalendar"
  }
];

export class Sources {
  static byPlatform(platform:string): source[] {
    return sources.filter(s => s.platform === platform);
  }
}