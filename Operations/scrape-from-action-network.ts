import { ActionNetworkScraper } from "../Scrapers/ActionNetworkScraper";
import { Sources } from "../Models/Sources";

async function main() {
  for (let source of Sources.byPlatform('action network')) {
    const scraper = new ActionNetworkScraper(source.org, source.url);
    await scraper.scrape(20);    
  }
}

main();