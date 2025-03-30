import { HTMLScraper } from "./HTMLScraper";
import { TwoStepScraper, StoppedByCaptcha } from "./ScraperInterfaces";
import { initSavedScrap, SavedScrap, Scrap } from "../models/Scrap";
import * as cheerio from "cheerio";
import parseMomentFromString from "../utilities";
import Event, { initEventModel } from "../models/Event";
import { Op } from "sequelize";
import moment from "moment";
import { waitRandomSeconds } from "../utilities";

const DOMAIN = "https://actionnetwork.org";

export class ActionNetworkScraper
  extends HTMLScraper
  implements TwoStepScraper
{
  constructor(public sourceOrg: string, public sourceListURL: string) {
    super();
    initEventModel();
    initSavedScrap();
  }

  /**
   * Pulls a list of events from the source URL and parses them into an array of `Scrap` objects.
   *
   * This method downloads the HTML content of the source list URL, extracts relevant event data
   * from a specific script tag, and processes it into structured `Scrap` objects. It filters out
   * invalid or incomplete entries.
   *
   * @returns {Promise<Scrap[]>} A promise that resolves to an array of `Scrap` objects containing
   * event details such as title and source ID. Returns an empty array if the webpage or script
   * content is unavailable.
   *
   * @throws {Error} May throw errors if the HTML download or parsing fails unexpectedly.
   */
  async pullSourceList(): Promise<Scrap[]> {
    const webpage = await this.downloadHTML(this.sourceListURL);
    if (!webpage) return [];
    const script = webpage("#our_actions script")?.html();
    if (script === null) return [];

    const extractEventHTML = (line: string): cheerio.CheerioAPI =>
      cheerio.load(
        line
          .trim()
          .replace("group_public_action_list_array.push({ li_wrapper: '", "")
          .replace("',", "")
      );

    const buildScrapFromEventHTML = ($: cheerio.CheerioAPI) => {
      const sourceURL = $("a").attr("href") ?? null;
      return SavedScrap.build({
        eventTitle: $("a").text(),
        sourceURL,
        sourceId: sourceURL,
        sourceOrg: this.sourceOrg,
      });
    };

    const scraps: SavedScrap[] = script
      .split(/\r?\n/)
      .filter((line: string) => line.includes(DOMAIN))
      .map(extractEventHTML)
      .map(buildScrapFromEventHTML);

    const newScraps = [];
    for (let scrap of scraps) {
      // check whether we've already captured this scrap before
      const storedScrap = await SavedScrap.findAndCountAll(
        { where: { sourceId: scrap.sourceId } }
      );

      // Only save new scrap if it's totally new
      if (storedScrap.count === 0) {
        await scrap.save();
        newScraps.push(scrap);
      }
    }

    return newScraps;
  }

  /**
   * Parses and extracts event details from the provided HTML content and updates the given `Scrap` object.
   *
   * @param starter - The initial `Scrap` object to be updated with parsed data.
   * @param html - The HTML content to parse, either as a string or a `cheerio.CheerioAPI` instance.
   * @returns The updated `Scrap` object with extracted event details.
   *
   * The method performs the following:
   * - Loads the HTML content using Cheerio if it is provided as a string.
   * - Extracts event dates from elements with the class `.event_date`.
   * - Parses the start and end dates, defaulting the end date to one hour after the start if not explicitly provided.
   * - Extracts additional event details such as location and description from elements with the classes `.event_location` and `.action_description`.
   * - Updates the `Scrap` object with the parsed start date, end date, location, and description.
   *
   * If no valid start date is found, the method returns the `starter` object unchanged.
   */
  parseScrapFrom(starter: SavedScrap, html: string | cheerio.CheerioAPI): SavedScrap {
    if (typeof html === "string") {
      html = cheerio.load(html);
    }

    if (html.text().includes('CAPTCHA check')) {
      throw new StoppedByCaptcha('Action Network suspicious of this IP.');
    }

    const dates = html(".event_date");
    if (dates.length > 0) {
      const date = (i: number) => parseMomentFromString(dates.eq(i).text());
      const start = date(0) ?? moment();
      const defaultEnd = start.clone().add(1, "hours");
      const end = dates.length > 1 ? date(1) ?? defaultEnd : defaultEnd;
      const textIn = (s: string) => (html(s) ? html(s).text().trim() : "");
      const location = textIn(".event_location");
      const description = textIn(".action_description");
      const oldData = starter.data ?? new Map();
      const newData = new Map();
      newData.set("start", start);
      newData.set("end", end);
      newData.set("location", location);
      newData.set("description", description);
      starter.data = new Map([...oldData, ...newData]);
    }
    starter.lastScrape = moment();

    return starter;
  }

  getScrapeURL(scrap: Scrap): string {
    return scrap.sourceId;
  }

  async scrape(limit: number): Promise<Scrap[]> {
    const dueScraps = await this.getDueScraps(limit);
    const successfulScraps = [];
    try {
      for (let dueScrap of dueScraps) {
        console.log(`Scraping "${dueScrap.eventTitle}."`);
        await this.scrapeOne(dueScrap);
        successfulScraps.push(dueScrap);
        await waitRandomSeconds(2, 4);
      }  
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Unknown error';
      console.log(`An error occurred while scraping: ${message}`);
    }
    console.log(`Successfully scraped ${successfulScraps.length} out of ${dueScraps.length} due scraps`);
    return successfulScraps;
  }

  async getDueScraps(limit: number = 10): Promise<SavedScrap[]> {
    return await SavedScrap.findAll({
      where: {
        sourceOrg: this.sourceOrg,
        lastScrape: { [Op.is]: null }
      },
      order: [
        ["saveDate", "ASC"],
        ["id", "ASC"],
      ],
      limit,
    });
  }

  async scrapeOne(scrap: SavedScrap): Promise<SavedScrap> {
    const scrapeURL = this.getScrapeURL(scrap);
    const webpage = await this.downloadHTML(scrapeURL);
    scrap = this.parseScrapFrom(scrap, webpage);
    return await scrap.save();
  }

  async getReadyScraps(): Promise<SavedScrap[]> {
    return await SavedScrap.findAll({
      where: {
        sourceOrg: this.sourceOrg,
        [Op.and]: [
          { lastScrape: { [Op.not]: null } },
          { data: { [Op.not]: null } },
        ],
      },
      order: [
        ["saveDate", "ASC"],
        ["id", "ASC"],
      ]
    });
  }

  async convertScrapsToEvents(scraps: Scrap[]): Promise<Event[]> {
    // Convert all scraps to events
    const scrapEvents = scraps
      .map(scrap => scrap.convertToEvent())
      .filter(scrap => scrap instanceof Event);

    // If a scrap is new, save it directly to events table
    const handleNewScrap = async (scrapEvent: Event) => await scrapEvent.save();
    // If event already exists for scrap, update that existing scrap
    const handleOldScrap = async (scrapEvent: Event, storedEvent: Event) => {
      storedEvent.updateFrom(scrapEvent);
      return await storedEvent.save();
    };

    // Handle every scrapped event according to whether it was old or new
    const savedEvents = [];
    for (let scrapEvent of scrapEvents) {
      const storedEvent = await Event.findBySourceId(scrapEvent.sourceId);
      const savedEvent = storedEvent === null
        ? await handleNewScrap(scrapEvent)
        : await handleOldScrap(scrapEvent, storedEvent);
      savedEvents.push(savedEvent);
    }

    return savedEvents;
  }
}