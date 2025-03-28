import { SavedScrap, Scrap } from "../Models/Scrap";

/**
 * Scrapers are responsible for downloading raw data ("scraps") from a source,
 * converting scraps to Event entities, and saving those Events to the database.
 */
export interface Scraper {
  sourceOrg: string; // The source org from whom we're scraping events.

  /**
   * Convert given "scraps" (raw data downloaded from a source) into Event
   * objects and insert them into database if new, or update if already existing.
   *
   * @returns ScrapedEvent[] An array of events inserted or updated in database
   */
  convertScrapsToEvents(scraps: Scrap[]): Promise<ScrapedEvent[]>;

  /**
   * Gets an array of all scraps ready to be saved to the Events table. The
   * output of this method is expected to be used as input for the
   * convertScrapsToEvents() method.
   */
  getReadyScraps(): Promise<Scrap[]>;
}

/**
 * These are scrapers that can pull full calendar of events in one API call.
 * One-Step Scrapers don't require an additional API call per event. All scraps
 * pulled by this scraper are immediately ready for converstion to Event objects.
 */
export interface OneStepScraper extends Scraper {
  sourceURL: string; // The URL from which we download all scrap data

  /**
   * Executes API call to download all events from source org. Results of this
   * method can be used directly by the getReadyScraps() method.
   * @returns Scrap[] Array of scraps ready to be converted into Event objects.
   */
  scrape(): Promise<Scrap[]>;
}

export interface MultiStepScraper extends Scraper {
  /**
   * Final Step: Execute HTTP requests for scraps in queue from Step 1.
   *
   * @param limit is the maximum number of scrapes to execute at a time. This
   *        ensures we don't accidentally overload the source URL.
   * @returns Scrap[] that are saved in queue with new details and can be picked
   *          up by getReadyScraps() at a later time.
   */
  scrape(limit: number): Promise<Scrap[]>;

  /**
   * Part of Final Step, this method is used in body loop of scrape() method.
   *
   * @param scrap to be scraped from its source URL
   * @returns same scrap from parameters but updated with newly scraped details.
   *          Returned scrap is expected to be ready after this method.
   */
  scrapeOne(scrap: SavedScrap): Promise<SavedScrap>;

  /**
   * Provides the URL to use in an HTTP GET request to scrape remaining details
   * about an individual event. Part of "final step" in a multi-step process.
   *
   * @param scrap The scrap for which to produce a URL
   * @returns string The URL for scraping details about an individual event
   */
  getScrapeURL(scrap: Scrap): string;
}

/**
 * These scrappers require two API calls: first to pull a list of events, and
 * second to scrape details about an individual event in that list.
 */
export interface TwoStepScraper extends MultiStepScraper {
  sourceListURL: string; // The URL from which we download list of all events

  /**
   * Step 1: Execute HTTP request for list of all events that can be scraped.
   *
   * @returns Scrap[] An array of scraps to be saved in queue for Step 2.
   */
  pullSourceList(): Promise<Scrap[]>;
}

/**
 * These scrapers requre three API calls: first to get the pages of events to scrape,
 * second to get a list of events per page, third to scrape individual event details.
 */
export interface ThreeStepScraper extends MultiStepScraper {
  sourcePagesURL: string; // The URL from which we download the list of all pages

  /**
   * Step 1: Execute HTTP request for list of all pages of events
   */
  pullPagesList(): Promise<Page[]>;

  /**
   * Step 2: Execute HTTP request to get list of events from an individual page.
   */
  pullPage(page: Page): Promise<Scrap[]>;

  /**
   * Part of Step 2, this method gets the URL for the individual page to pull from.
   */
  getPageURL(page: Page): string;
}

/**
 * An event created from a scrap that can be saved in Events table.
 */
export interface ScrapedEvent {
  title: string; // The title of the scraped event.
  sourceId: string; // The scraper uses this to associate the event with the scrap.
  sourceOrg: string; // The organization from whom this event was scraped from.
}

export interface Page {}

export class StoppedByCaptcha extends Error { }
