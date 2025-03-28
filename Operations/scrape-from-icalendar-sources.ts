import { ICalendar } from "../Scrapers/ICalendar";
import { Sources } from "../Models/Sources";

async function main() {
  for (let source of Sources.byPlatform('icalendar')) {
    const scraper = new ICalendar(source.url, source.org);
    await scraper.updateDatabase();
  }
}

main();