import { DBCWebsiteScraper } from "../Scrapers/DBCWebsiteScraper";

const sourceOrg = 'Dallas Bicycle Coalition';
const sourceURL = 'https://dallasbicyclecoalition.org/calendar';
const website = new DBCWebsiteScraper(sourceURL, sourceOrg);
website.updateDatabase();