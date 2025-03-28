export class EventDTO {
  id: string;
  title: string;
  start: string;
  end: string;
  location: string;
  description: string;

  constructor(data: any) {
    this.id = data.id;
    this.title = data.title;
    this.start = data.start;
    this.end = data.end;
    this.location = data.location;
    this.description = data.description;
  }
}