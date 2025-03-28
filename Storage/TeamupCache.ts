import { StorageInterface } from './StorageInterface';

export class TeamupCache implements StorageInterface {
  saveEvent(event: any): Promise<void> {
    // Implementation for saving an event
    return Promise.resolve();
  }

  getEventById(id: string): Promise<any> {
    // Implementation for retrieving an event by ID
    return Promise.resolve(null);
  }
}