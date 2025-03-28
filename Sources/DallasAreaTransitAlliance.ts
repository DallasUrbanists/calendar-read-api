import ChannelInterface from "../Channels/ChannelInterface";
import { ICalendar } from "../Channels/ICalendar";
import Event from "../Models/Event";
import SourceInterface from "./SourceInterface";

export class DallasAreaTransitAlliance implements SourceInterface {
  public channel: ChannelInterface;
  public events: Event[] = [];

  constructor() {
    this.channel = new ICalendar(
      'https://calendar.google.com/calendar/ical/c_b84185fb0c5798bfc8d926ac5013d4ed1fdbd0c3fb79a960686fbb9250037595%40group.calendar.google.com/public/basic.ics',
      'Dallas Area Transit Alliance'
    );
  }

  async updateStore(): Promise<void> {
    return this.channel.updateDatabase();
  }

  async getStoredEvents(): Promise<Event[]> {
    return await this.channel.getEventsFromStore();
  }
}

async function main() {
  const DATA = new DallasAreaTransitAlliance();
  DATA.updateStore().then(() => {
    DATA.getStoredEvents();
  })
}

main();