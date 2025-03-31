import { ICalendar } from "../scrapers/ICalendar";
import { Sources } from "../models/Sources";
import { initEventModel } from "../models/Event";
import { initSavedScrap } from "../models/Scrap";
import { sequelize } from "../database/sequelize";

initEventModel();
initSavedScrap();

async function main() {
  await sequelize.authenticate();

  for (let source of Sources.byPlatform('icalendar')) {
    const scraper = new ICalendar(source.url, source.org);
    await scraper.updateDatabase();
  }
}

main();