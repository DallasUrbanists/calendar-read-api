import { ActionNetworkScraper } from "../Scrapers/ActionNetworkScraper";
import { Sources } from "../Models/Sources";

async function main() {
  const sources = Sources.byPlatform('action network');
  for (let source of sources) {
    const scraper = new ActionNetworkScraper(source.org, source.url);
    const readyScraps = await scraper.getReadyScraps();
    await scraper.convertScrapsToEvents(readyScraps);
  }
}

main();