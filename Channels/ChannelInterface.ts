import Event from '../Models/Event';

export default interface ChannelInterface {
  getEventsFromStore(): Promise<Event[]>;
  updateDatabase(): Promise<void>;
}