import axios from "axios";
import * as cheerio from "cheerio";
import { Scrap } from "../models/Scrap";

/**
 * An abstract class representing an HTML scraper that provides functionality
 * to download and parse HTML content from a webpage.
 *
 * @abstract
 */
export abstract class HTMLScraper {
  /**
   * Downloads the HTML content of a webpage and loads it into a Cheerio instance for parsing.
   *
   * @param webpageURL - The URL of the webpage to download.
   * @returns A promise that resolves to a CheerioAPI instance for parsing the HTML content.
   *
   * @throws Will throw an error if the HTTP request fails.
   */
  async downloadHTML(webpageURL: string): Promise<cheerio.CheerioAPI> {
    const request = { headers: { "User-Agent": "Mozilla/5.0" } };
    const response = await axios.get(webpageURL, request);
    const html = response.data;

    return cheerio.load(html);
  }

  /**
   * Adds details to scrap from HTML.
   *
   * @param starter - The scrap to add details to.
   * @param html - The webpage from which details are scraped.
   * @returns The original starter scrap but with added scraped details.
   * @abstract
   */
  abstract parseScrapFrom(
    starter: Scrap,
    html: string | cheerio.CheerioAPI
  ): Scrap;
}