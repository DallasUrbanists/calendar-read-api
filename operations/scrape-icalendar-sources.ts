import { ICalendar } from "../scrapers/ICalendar";
import { Sources } from "../models/Sources";

async function main() {
  for (let source of Sources.byPlatform('icalendar')) {
    const scraper = new ICalendar(source.url, source.org);
    await scraper.updateDatabase();
  }
}

main();