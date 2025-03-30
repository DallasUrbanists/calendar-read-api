import { ActionNetworkScraper } from "../scrapers/ActionNetworkScraper";
import { Sources } from "../models/Sources";

async function main() {
  const sources = Sources.byPlatform('action network');
  for (let source of sources) {
    const scraper = new ActionNetworkScraper(source.org, source.url);
    const readyScraps = await scraper.getReadyScraps();
    await scraper.convertScrapsToEvents(readyScraps);
  }
}

main();