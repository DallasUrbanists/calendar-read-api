import { ActionNetworkScraper } from "../scrapers/ActionNetworkScraper";
import { Sources } from "../models/Sources";
import { waitRandomSeconds } from "../utilities";

async function main() {
  const sources = Sources.byPlatform('action network');
  for (let source of sources) {
    const scraper = new ActionNetworkScraper(source.org, source.url);
    console.log(`ACTION NETWORK: Begin scraping list for ${source.org}`);
    try {
      const scraps = await scraper.pullSourceList();
      console.log(
        `ACTION NETWORK: Successfully scraped list, ${scraps.length} new items.`
      );
      await waitRandomSeconds(2, 4);
    } catch (e) {
      console.error(`ACTION NETWORK: ERROR: while scraping list from ${source.url}.`);
      return;
    }
  }
  console.log(
    `ACTION NETWORK: Finished scraping lists for ${sources.length} sources.`
  );
}

main();