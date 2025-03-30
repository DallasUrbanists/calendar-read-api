import { DataTypes, Model } from "sequelize";
import { ScrapedEvent } from "../scrapers/ScraperInterfaces";
import Event from "./Event";
import { sequelize } from "../database/sequelize";
import moment from "moment";

/**
 * Scraps are raw data downloaded from a source.
 *
 * A scrap is considered "ready" when it has the minimimum details required to
 * be converted into an Event. A scrap is considered "due" when it doesn't
 * have a corresponding Event entity saved in the database, or the scrap has new
 * data that needs to be updated in the database.
 */

export interface Scrap {
  eventTitle: string; // The title of the scraped event.
  sourceId: string; // The unique identifier of this scrap from the source.
  sourceOrg: string; // The organization from whom this scrap was pulled from.
  data: Map<string, any>; // The actual scraped data as key-value pairs.

  /**
   * Determines whether this scrap has enough data to convert into an Event
   * @returns true if scrap is ready to be converted to an Event
   */
  isReady(): boolean;

  /**
   * Converts this scrap into an Event object.
   * @returns Event based on this scrap's data.
   *          null if scrap wasn't ready to be converted to an event.
   */
  convertToEvent(): ScrapedEvent | null;

  /**
   * Determines whether or not this scrap is due based on whether the scrap
   * contains new data compared to the stored event.
   * @returns true if the scrap contains new data compared to stored event.
   *          false if the stored event already has all data from scrap.
   */
  isDueComparedTo(storedEvent: ScrapedEvent): boolean;
}

/**
 * Represents a scraper for extracting event data from Action Network.
 * Implements the `Scrap` interface to provide methods for checking readiness,
 * converting to an event model, and comparing with stored events.
 */
export class SavedScrap extends Model implements Scrap {
  declare eventTitle: string;
  declare sourceId: string;
  declare sourceOrg: string;
  declare data: Map<string, any>;
  declare saveDate: moment.Moment;
  declare lastScrape: moment.Moment | null;

  isReady(): boolean {
    const requiredKeys = ["start", "end", "description", "location"];
    return requiredKeys.every((key) => this.data.has(key));
  }

  convertToEvent(): ScrapedEvent | null {
    return this.isReady() ? Event.fromScrap(this) : null;
  }

  isDueComparedTo(storedEvent: ScrapedEvent): boolean {
    return true; // TODO
  }
}

export const initSavedScrap = () =>
  SavedScrap.init(
    {
      eventTitle: { type: DataTypes.STRING, allowNull: false },
      sourceId: { type: DataTypes.STRING, allowNull: false },
      sourceOrg: { type: DataTypes.STRING, allowNull: false },
      data: {
        type: DataTypes.JSONB,
        allowNull: true,
        set(value: Map<string, any> | null) {
          this.setDataValue(
            "data",
            value instanceof Map ? Object.fromEntries(value) : null
          );
        },
        get() {
          const value = this.getDataValue("data");
          return value === null ? null : new Map(Object.entries(value));
        },
      },
      saveDate: {
        type: DataTypes.DATE,
        defaultValue: moment().format(),
        set(value: moment.Moment | Date | string) {
          this.setDataValue("saveDate", moment(value).format());
        },
        get() {
          return moment(this.getDataValue("saveDate"));
        },
      },
      lastScrape: {
        type: DataTypes.DATE,
        allowNull: true,
        defaultValue: null,
        set(value: moment.Moment | Date | string | null) {
          if (value !== null) {
            this.setDataValue("lastScrape", moment(value).format());
            if (!this.getDataValue("saveDate")) {
              this.setDataValue("saveDate", moment(value).format());
            }
          } else {
            this.setDataValue("lastScrape", null);
          }
        },
        get() {
          return this.getDataValue("lastScrape")
            ? moment(this.getDataValue("lastScrape"))
            : null;
        },
      },
    },
    {
      sequelize,
      modelName: "SavedScrap",
      tableName: "scraps",
      timestamps: false, // Disable Sequelize's automatic `createdAt` and `updatedAt` fields
    }
  );
