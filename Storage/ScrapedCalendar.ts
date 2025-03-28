import Event from '../Models/Event';
import { StorageInterface } from './StorageInterface';

export class ScrapedCalendar implements StorageInterface {
  private storedEvents:Event[] = [];

  async store(inboundEvents:Event[]): Promise<Event[]> {
    const storedEvents = await this.getStoredEvents();
    return inboundEvents;
  }

  async getStoredEvents() {
    if (this.storedEvents.length === 0) {
      this.storedEvents = [];
    }

    return this.storedEvents;
  }
}