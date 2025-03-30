import { DBCWebsiteScraper } from "../scrapers/DBCWebsiteScraper";

const sourceOrg = 'Dallas Bicycle Coalition';
const sourceURL = 'https://dallasbicyclecoalition.org/calendar';
const website = new DBCWebsiteScraper(sourceURL, sourceOrg);
website.updateDatabase();