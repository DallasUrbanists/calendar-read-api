import ChannelInterface from './ChannelInterface';
import Event from '../Models/Event';

export class ActionNetwork implements ChannelInterface {
  async getEventsFromStore(): Promise<Event[]> {


    return [];
  }
}