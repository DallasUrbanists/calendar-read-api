require("dotenv").config();
import _ from "lodash";
import moment, { isMoment } from "moment";
import { DataTypes, Model } from "sequelize";
import { sequelize } from "../Database/sequelize";
import { ScrapedEvent, TeamupData } from "../Scrapers/ScraperInterfaces";
import { DEFAULT_DURATION, HOSTS_LIST_DELIMITER, SIMILARITY_HOUR_THRESHOLD, SIMILARITY_TITLE_THRESHOLD_HIGH, SIMILARITY_TITLE_THRESHOLD_LOW, SIMILARITY_TITLE_THRESHOLD_MID } from "../settings";
import {
  eventIsRelevant,
  fuzzyMatch,
  getSimilarityPercentage,
  isNotBlank,
  nonorgBrackets,
  parseBrackets,
  polyRead,
  removeBrackets
} from '../utilities';
import {
  adhocOrg,
  findOrganization,
  findOrganizationsInTitle,
  Organization,
  organizations
} from './Organizations';
import { Scrap } from "./Scrap";


export default class Event extends Model implements ScrapedEvent {
  // IDENTIFIERS
  declare id: number; // The identifier for this entity as stored in the scraper web service
  declare sourceId: string; // The identifier for this entity provided by its source
  declare teamupId?: string; // The identifier for this entity provided by Teamup API
  // BASIC DETAILS
  declare title: string;
  declare start: moment.Moment;
  declare end: moment.Moment;
  declare isAllDay: boolean;
  declare location: string;
  declare description: string;
  declare hosts: string[];
  declare link?: string; // URL of webpage for this event
  declare categories: string[];
  // HISTORY
  declare creationDate: moment.Moment;
  declare lastModified: moment.Moment;
  declare sourceTitle: string; // The un-edited name of this event as received from source before normalization
  declare sourceOrg: string; // The name of the organization from whom we pulled this event
  // TEAMUP DETAILS
  declare teamup?: {
    id?: string, // This is just serves as a shortcut / pass-through to this.teamupId
    mainCalendar?: string,
    subCalendars: string[],
    endpoint?: string, // Endpoint for fetching this event from TeamUp API
  };
  // REFERENCES
  declare canonSourceId?: string; // Points to the canonical event. Points to self if this is the canonical event. Null if canon unknown.
  declare siblingSourceIds: string[] ; // Array of all the events that share the same canon.
  
  /**
  * Normalizes the event by cleaning up the title, organizing the hosts, and adjusting start/end times if all day
  * @description
  * - Extracts organization names from square brackets in the title and adds them to the `hosts` array.
  * - Cleans up the title by removing square brackets and their contents.
  * - Replaces aliases and misspellings in the `hosts` array with the official organization names.
  * - Ensures the `hosts` array contains only unique and non-empty values.
  * - If all day, set start time and end time to midnight
  */
  normalize(): this {
    // Sometimes people put the organization name in the event title with square brackets.
    // If they've done so, let's move the organization name from the title to the hosts property
    const titleBrackets = parseBrackets(this.title, true);
    if (titleBrackets && titleBrackets?.length > 0) {
      // Because we can't enforce a standard practice of one org name per pair of square brackets
      // Detect when multiple org names share a pair of square brackets based on use of special characters
      const titleBracketOrgs = _.flatten(titleBrackets.map(b => b.split(/[;,+&]/).map(s => s.trim()).filter(s => s !== "")));
      
      // Now add these organizations to the hosts array
      this.hosts = _.uniq(_.flatten([
        this.hosts ?? [],
        titleBracketOrgs
      ]));

      // Now that we've captured all the hosts
      // We can remove them from the title to clean it up
      this.title = removeBrackets(this.title);
    }

    // Sometimes people put their organization name in the event title
    // If they've done so, let's move the organization name from the title to the hosts property
    const orgsInTitle = findOrganizationsInTitle(this.title);
    if (orgsInTitle && orgsInTitle?.length > 0) {
      orgsInTitle.forEach(org => {
        if (!this.hosts.includes(org.name)) {
          this.hosts.unshift(org.name);
        }
      });
    }
    
    // The spelling and alias of organization names are not always consistent.
    // In the hosts array, replace aliases and misspellings with the org's official name
    this.hosts = this.hosts
      .map(host => {
        const match = organizations.find(org => 
          fuzzyMatch(org.name, host) ||
          org.aliases.some(alias => fuzzyMatch(alias, host))
        );
        return (match ? match.name : host).trim();
      })
      // Remove blanks
      .filter(isNotBlank)
      // Remove non-org tags, like "[OFFICIAL]"
      .filter(host => !nonorgBrackets.includes(`[${host}]`));
    
    // Remove duplicates from hosts array
    this.hosts = _.uniq(this.hosts);
    
    // Determine if this is a canon event based on various possible criteria
    const sourceOrgIsOnlyHost = this?.hosts?.length === 1 && this?.hosts[0] === this.sourceOrg;
    const sourceOrgIsOnlyTitleHost = orgsInTitle?.length === 1 && orgsInTitle[0]?.name === this.sourceOrg;
    if (!this.canonSourceId) {
      if (sourceOrgIsOnlyHost || sourceOrgIsOnlyTitleHost) {
        this.canonize()
      }
    }

    // Decide which host to push to the front of the hosts array
    // i.e. the "Primary Host"
    if (this.hosts.length > 0) {
      if (orgsInTitle.length === 1) {
        this.setPrimaryHost(orgsInTitle[0].name);
      } else if (orgsInTitle.length === 0) {
        this.setPrimaryHost(this.sourceOrg, false);
      // If there are multiple hosts and multiple title orgs
      // then sort hosts to match their appearance in the title
      // source org follows title orgs, non-source non-title orgs are last
      } else {
        this.hosts.sort((a, b) => {
          const orgA = findOrganization(a) ?? adhocOrg(a);
          const orgB = findOrganization(b) ?? adhocOrg(b);
          const indexA = orgsInTitle.indexOf(orgA);
          const indexB = orgsInTitle.indexOf(orgB);
          
          // If only one host in title, prefer that host
          if (indexA > -1 && indexB === -1) return -1;
          if (indexB > -1 && indexA === -1) return 1;

          // If both hosts in title, prefer the one that appears earlier
          if (indexA > -1 && indexB > -1) return indexA - indexB;

          // If neither host in title, prefer source org
          if (a === this.sourceOrg) return -1;
          if (b === this.sourceOrg) return 1;

          // No change in sort order
          return 0;
        });
      }
    }

    // Set the event category based on the primary host
    if (this.categories.length === 0) {
      this.categories = this.getPrimaryHost().categories;
    }
    
    // Fix if end is before the start
    if (this.end.isBefore(this.start)) {
      this.end = this.start.clone().add('1', 'hours');
    }

    // If all day, set start time and end time to midnight
    if (this.isAllDay) {
      this.start?.startOf("day");
      this.end?.endOf("day");
    }
    
    return this;
  }

  static fromScrap(scrap:Scrap): Event {
    return Event.build({
      title: scrap.eventTitle,
      sourceTitle: scrap.eventTitle,
      sourceId: scrap.sourceId,
      sourceOrg: scrap.sourceOrg,
      start: scrap.data.get('start') ?? moment().startOf('hour'),
      end: scrap.data.get('end') ?? moment().startOf('hour').add(1, 'hours'),
      isAllDay: scrap.data.get('isAllDay') ?? false,
      location: scrap.data.get('location') ?? '',
      description: scrap.data.get('description') ?? '',
      hosts: scrap.data.get('description') ?? [],
      link: scrap.data.get('link') ?? '',
      categories: scrap.data.get('categories') ?? [],
    });
  }

  setPrimaryHost(name: string, insertIfNew: boolean = true): string[] {
    if (!this.hosts.includes(name)) {
      if (insertIfNew) {
        this.hosts.unshift(name);
      }
    } else {
      this.hosts.sort((a, b) => {
        if (a === name) return -1;
        return b === name ? 1 : 0;
      });
    }
    return this.hosts;
  }
  
  getPrimaryHost(): Organization {
    const primaryHost:string = this.hosts[0] ?? this.sourceOrg;
    return findOrganization(primaryHost) ?? adhocOrg(primaryHost);
  }

  /**
  * Updates this event using data from an other event.
  * @description
  * - If otherEvent was updated more recently, then all details will be copied over
  * - If otherEvent not updated more recently, then only missing details will be copied over
  * - In either case, null values will never be copied from otherEvent to this event
  * @param otherEvent 
  */
  updateFrom(other:Event): this {
    const otherIsNewer = other.isNewerThan(this);
    const valueIsBlank = (value:any) => value !== undefined && value !== null && value !== '';
    const update = (otherVal:any, thisVal:any) => (otherIsNewer && !valueIsBlank(otherVal)) || valueIsBlank(thisVal) ? otherVal : thisVal;
    
    // Always use newer version of the following details
    this.title = update(other.title, this.title);
    this.start = update(other.start, this.start);
    this.end = update(other.end, this.end);
    this.isAllDay = update(other.isAllDay, this.isAllDay);
    this.location = update(other.location, this.location);
    this.description = update(other.description, this.description);
    this.link = update(other.link, this.link);
    this.lastModified = update(other.lastModified, this.lastModified);
    
    // Always combine the following details
    this.mergeHosts(other.hosts);
    this.mergeSiblings(other.siblingSourceIds);
    
    // Only update canon if it's not already set on this event
    if (!this.canonSourceId) {
      this.canonSourceId = other.canonSourceId;
    }
    if (!this.teamupId) {
      this.teamupId = other.teamupId;
    }
    
    return this;
  }
  
  // 
  crossUpdateWith(other:Event): this {
    this.updateFrom(other);
    other.updateFrom(this);
    return this;
  }
  
  /**
  * Merge an array of hosts into this event's array of hosts. The resulting array
  * is a unique combination of both host arrays (duplicates are removed).
  * @returns Newly combined array of unique strings
  */
  mergeHosts(hosts:string[]): string[] {
    this.hosts = _.uniq([...this.hosts, ...hosts]);
    return this.hosts;
  }
  
  /**
  * Merge an array of sibling source IDs into this event's array of siblings.
  * The resulting array a unique combination of both arrays, no duplicates.
  * @returns Newly combined array of unique strings
  */
  mergeSiblings(siblingSourceIds:string[] = []): string[] {
    this.siblingSourceIds = [...new Set([...(this.siblingSourceIds ?? []), ...siblingSourceIds])];
    return this.siblingSourceIds;
  }
  
  /**
  * Determines whether this event was modified more recently than the other event 
  */
  isNewerThan(otherEvent:Event): boolean {
    const thisLastModified = this.lastModified ?? this.creationDate;
    const otherLastModified = otherEvent.lastModified ?? otherEvent.creationDate;
    return thisLastModified ? thisLastModified.isAfter(otherLastModified) : false;
  }
  
  /**
  * Mark this event as canon
  */
  canonize(siblings:Event[] = []): this {
    this.canonSourceId = this.sourceId;
    return this;
  }
  
  /**
  * Determines whether or not this is a canon event.
  * @returns true if event is marked as canon; false otherwise. 
  */
  isCanon(): boolean {
    return this.canonSourceId === this.sourceId;
  }
  
  /**
  * Calculates the default end time for an event based on its start time
  */
  static defaultEnd(start: moment.Moment): moment.Moment {
    return start.clone().add(...DEFAULT_DURATION);
  }
  
  /**
  * Deserializes a string of hosts into an array of individual hosts.
  */
  static deserializeHosts(hosts: string | string[]): string[] {
    return Array.isArray(hosts)
    ? hosts.map(s=>s.trim())
    : _.toString(hosts).split(HOSTS_LIST_DELIMITER).map(s=>s.trim());
  }
  
  /**
  * Determines if the current event is probably the same as another event.
  */
  isProbablySameAs(other:Event): boolean {
    // If events have identical IDs, consider them the same  
    if (
      (this.id !== null && this.id === other.id) ||
      (this.sourceId !== null && this.sourceId === other.sourceId)
     ) {
      return true;
    }
    
    // If events don't start on the same day, we won't consider them the same
    if (!this.start?.isSame(other.start, 'day')) {
      return false;
    }
    
    // Helper method: remove any text in square brackes from titles before comparing
    // This is because it's common for duplicate events to have org name in brackets
    // e.g. "[Dallas Neighbors for Housing] Housing Bills in Texas Legislature"
    const title = (e:Event) => removeBrackets(e.title);
    
    // Use higher or lower similarity threshold based on how many hours apart the two events are
    const hourDifference = Math.abs(this.start.diff(other.start, 'h'));
    const similarityThreshold = hourDifference <= SIMILARITY_HOUR_THRESHOLD
    ? SIMILARITY_TITLE_THRESHOLD_MID
    : SIMILARITY_TITLE_THRESHOLD_HIGH;
    const titleSimilarity = getSimilarityPercentage(title(this), title(other));
    
    // The lowest threshold can be used if the locations match
    const isSameLocation = fuzzyMatch(this.location, other.location);

    return (
      (titleSimilarity >= similarityThreshold) ||
      (isSameLocation && titleSimilarity >= SIMILARITY_TITLE_THRESHOLD_LOW)
    ); 
  }
  
  /**
  * Tells web scraper that this event can be ignored because there is a
  * trigger word in the title or description
  */
  isIgnorable(): boolean {
    return [
      '[CANCELED]',
      '[CANCELLED]',
      '[DO NOT IMPORT]',
      '[DO NOT SYNC]',
      '[DO NOT TRACK]',
      '[DON\'T IMPORT]',
      '[DON\'T SYNC]',
      '[DON\'T TRACK]',
      '[DUPLICATE]',
      '[EXCLUDE]',
      '[HIDDEN]',
      '[IGNORE]',
      '[NOT FOR PUBLIC]',
      '[NOT PUBLIC]',
      '[NO BOTS]',
      '[NO IMPORT]',
      '[NO SYNC]',
      '[NO TRACK]',
      '[PLACEHOLDER]',
      '[PRIVATE]',
      '[SPAM]',
      '[TEST]',
      '[TEST EVENT]',
    ].some(trigger => 
      this.sourceTitle.includes(trigger) || this.description.includes(trigger)
    );
  }

  isGroomable(): boolean {
    return eventIsRelevant(this);
  }

  asTeamupData(): TeamupData {
    return {
      subcalendar_ids: this.teamup?.subCalendars ?? [],
      start_dt: this.start.format(),
      end_dt: this.end.format(),
      all_day: this.isAllDay,
      notes: this.description,
      title: this.title,
      location: this.location,
      who: this.hosts.join(' + '),
      comments_enabled: false,
      /*custom: {
        link: this.link ?? null
      }*/
    }
  }

  static async findBySourceId(sourceId: string): Promise<Event | null> {
    return await Event.findOne({ where: { sourceId }});
  }
}

export const initEventModel = () => {
  Event.init(
    {
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
        get(): number {
          return this.getDataValue('id') ? this.getDataValue('id') : 0;
        }
      },
      sourceId: {
        type: DataTypes.STRING,
      },
      teamupId: {
        type: DataTypes.STRING,
      },
      title: {
        type: DataTypes.STRING,
        allowNull: false,
        get() {
          return this.getDataValue('title').trim();
        },
        set(value:string) {
          this.setDataValue('title', value.trim());
          if (!this.getDataValue('sourceTitle')) {
            this.setDataValue('sourceTitle', value.trim());
          }
        }
      },
      start: {
        type: DataTypes.DATE,
        allowNull: false,
        get() {
          const start = moment(this.getDataValue('start'));
          return (this.getDataValue('isAllDay') === true)
          ? start.startOf('day')
          : start;
        }
      },
      end: {
        type: DataTypes.DATE,
        allowNull: false,
        get() {
          const end = this.getDataValue('end')
          ? moment(this.getDataValue('end'))
          : moment(this.start).clone().add(1, 'hours');
          return (this.getDataValue('isAllDay') === true)
          ? end.endOf('day')
          : end;
        }
      },
      isAllDay: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
      },
      location: {
        type: DataTypes.STRING,
        defaultValue: '',
      },
      description: {
        type: DataTypes.TEXT,
      },
      hosts: {
        type: DataTypes.ARRAY(DataTypes.STRING),
      },
      link: {
        type: DataTypes.STRING,
      },
      categories: {
        type: DataTypes.ARRAY(DataTypes.STRING),
        defaultValue: []
      },
      creationDate: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: () => moment().format(),
        set(value) {
          const creationDate = moment(value ?? null);
          this.setDataValue('creationDate', creationDate.format());
          if (
            !this.getDataValue('lastModified') ||
            creationDate.isAfter(this.lastModified)
          ) {
            this.setDataValue('lastModified', creationDate.format());
          }
        },
        get() {
          return moment(this.getDataValue('creationDate'));
        }
      },
      lastModified: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: () => moment().format(),
        set(value) {
          const modifiedDate = moment(value ?? null);
          this.setDataValue('modifiedDate', modifiedDate.format());
          if (!this.getDataValue('creationDate')) {
            this.setDataValue('creationDate', modifiedDate.format());
          }
        },
        get() {
          return moment(this.getDataValue('modifiedDate'));
        }
      },
      sourceTitle: {
        type: DataTypes.STRING,
        get() {
          const sourceTitle = this.getDataValue('sourceTitle');
          return sourceTitle ? sourceTitle.trim() : this.title;
        },
        set(value:string) {
          this.setDataValue('sourceTitle', value.trim());
        }
      },
      sourceOrg: {
        type: DataTypes.STRING,
      },
      teamup: {
        type: DataTypes.JSONB,
        defaultValue: {
          id: '',
          mainCalendar: '',
          subCalendars: [],
          endpoint: ''
        }
      },
      canonSourceId: {
        type: DataTypes.STRING,
      },
      siblingSourceIds: {
        type: DataTypes.ARRAY(DataTypes.STRING),
      }
    },
    {
      sequelize,
      tableName: 'events',
      timestamps: false, // Disable Sequelize's automatic `createdAt` and `updatedAt` fields
    }
  );
  Event.beforeSave((event) => {
    event.hosts = Array.isArray(event.hosts) ? event.hosts : [];
    event.siblingSourceIds = Array.isArray(event.siblingSourceIds) ? event.siblingSourceIds : [];
  });
};

export function higherAuthority(a:Event, b:Event): number {
  // Number indicates which event has higher authority
  const higherA = -1;
  const higherB = 1;
  const equalAuthority = 0;
  type answer = -1 | 0 | 1;

  // Logical helper methods
  const read = (e:Event, p:string): any => {
    const v = polyRead(e, p);
    return isMoment(v) ? v.format() : v;
  };
  const is = (e:Event, p:string): boolean => read(e,p) === true;
  const different = (p:string): boolean => read(a,p) !== read(b,p);
  const both = (p:string): boolean => is(a,p) && read(b,p);
  const oneThat = (p:string): answer  => read(a,p) === true ? higherA : higherB;
  const oneThatIsnt = (p:string): answer  => read(a,p) === false ? higherA : higherB;
  const oneWithLesser = (p:string): answer => read(a,p) < read(b,p) ? higherA : higherB;
  const oneWithGreater = (p:string): answer => read(a,p) > read(b,p) ? higherA : higherB;
  const countBrackets = (e:Event): number => parseBrackets(e.sourceTitle).length;
  const countHosts = (e:Event): number => e.hosts.length;
  const notSame = (f:CallableFunction): boolean => f(a) !== f(b);
  const oneWithFewer = (f:CallableFunction): answer => f(a) < f(b) ? higherA : higherB;
  const onlyOneHas = (p:string): boolean => (read(a,p) && !read(b,p)) || (!read(a,p) && read(b,p));
  const oneThatHas = (p:string): answer => read(a,p) ? higherA : higherB;

  // Determine which event has higher authority based on these criteria
  if (different('isIgnorable')) return oneThatIsnt('isIgnorable');
  if (different('isCanon')) return oneThat('isCanon');
  if (both('isCanon')) return different('creationDate')
    ? oneWithLesser('creationDate')
    : oneWithGreater('lastModified');
  if (notSame(countBrackets)) return oneWithFewer(countBrackets);
  if (notSame(countHosts)) return oneWithFewer(countHosts);
  if (different('lastModified')) return oneWithGreater('lastModified');
  if (onlyOneHas('teamupId')) return oneThatHas('teamupId');

  // Which one has 
  return equalAuthority;
}

/**
 * Sort events in descending order of authority, highest authority first.
 */
export function sortByAuthority(events:Event[]): Event[] {
  return events.sort(higherAuthority);
}

function test() {
  initEventModel();
  const ev = Event.build({
    title: '[DATA][DBC] Sample Event',
    sourceOrg: 'Dallas Area Transit Alliance',
    hosts: ['DUSTLC']
  });
  ev.normalize();
  console.log(ev.hosts);
}
