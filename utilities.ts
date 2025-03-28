import _ from "lodash";
import moment from "moment";
import { MAX_DAYS_IN_PAST } from "./settings";
import Event from "./Models/Event";

export const ignorableBrackets = [
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
];
export const nonorgBrackets = [
  '[OFFICIAL]',
  '[TBA]',
  ...ignorableBrackets
];

/**
 * Calculates the similarity percentage between two strings using the Levenshtein Distance algorithm.
 * @param {string} str1 - The first string to compare.
 * @param {string} str2 - The second string to compare.
 * @returns {number} A number between 0 and 1 representing the similarity percentage.
 *                   1 indicates the strings are identical, and 0 indicates no similarity.
 */
export function getSimilarityPercentage(str1:string , str2:string ): number {
  // Levenshtein Distance Algorithm
  function levenshteinDistance(s1:string, s2:string) {
    const len1 = s1.length,
      len2 = s2.length;
    const dp = Array(len1 + 1)
      .fill(null)
      .map(() => Array(len2 + 1).fill(0));

    for (let i = 0; i <= len1; i++) dp[i][0] = i;
    for (let j = 0; j <= len2; j++) dp[0][j] = j;

    for (let i = 1; i <= len1; i++) {
      for (let j = 1; j <= len2; j++) {
        if (s1[i - 1] === s2[j - 1]) {
          dp[i][j] = dp[i - 1][j - 1]; // No change needed
        } else {
          dp[i][j] = Math.min(
            dp[i - 1][j] + 1, // Deletion
            dp[i][j - 1] + 1, // Insertion
            dp[i - 1][j - 1] + 1 // Substitution
          );
        }
      }
    }
    return dp[len1][len2];
  }

  if (!str1.length && !str2.length) return 1; // Both strings are empty
  if (!str1.length || !str2.length) return 0; // One is empty, no similarity

  const distance = levenshteinDistance(str1, str2);
  const maxLength = Math.max(str1.length, str2.length);

  // Calculate similarity percentage (0.5 = 50%)
  return 1 - distance / maxLength;
}

/**
 * Checks if two strings are practically the same. Allows for margin of error for spelling mistakes, minor formatting differences, etc.
 * @returns {boolean} - True if strings are at least 80% similar; false if less than 80%.
 */
export function fuzzyMatch(str1: string, str2: string) {
  const normalize = (str: string) => _.toUpper(str.trim().replace(/[^a-zA-Z0-9 ]/g, '').replace(/\s+/g, ' '));
  return 0.8 <= getSimilarityPercentage(normalize(str1), normalize(str2));
}

/**
 * Checks if a given location string is an alias for Dallas, TX.
 * Uses fuzzy matching to accommodate minor misspellings.
 * @returns {boolean} - True if the location is an alias of "Dallas, TX", false otherwise.
 */
export function isJustDallas(string: string): boolean {
  const aliases = [
    'DTX',
    'DALLAS',
    'DALLAS, TX',
    'DALLASTX',
    'DALLAS TEXAS',
    'DALLASTEXAS',
    'DAL'
  ];
  for (let alias of aliases) {
    if (fuzzyMatch(alias, string)) {
      return true;
    }
  }
  return false;
}

/** Extracts all text inside square brackets from a given string. */
export function parseBrackets(inputString: string, orgsOnly: boolean = false): string[] {
  let matches:string[] = inputString.match(/\[([^\]]+)\]/g) ?? [];
  // Remove brackets we know don't represent orgs, like [OFFICIAL]
  if (orgsOnly) {
    matches = matches.filter(m => nonorgBrackets.includes(m));
  }
  // Remove the opening and closing brackets
  return matches.map(match => match.slice(1, -1));
}

/** Removes square brackets and the text within them from a given string. */
export function removeBrackets(inputString: string): string {
  return inputString.replace(/\[.*?\]\s*/g, '').trim();
}

export function cleanAndParseJSON(rawText:string) {
  try {
    // Step 1: Trim whitespace
    let cleanedText = rawText.trim();
    
    // Step 2: Extract the valid JSON block using regex
    const jsonMatch = RegExp(/({[^]*}|\[[^]*\])/).exec(cleanedText);
    if (!jsonMatch) {
      throw new Error("No valid JSON found in the input.");
    }
    
    cleanedText = jsonMatch[0]; // Extract the JSON-like structure
    
    // Step 3: Remove non-printable control characters (except valid whitespace)
    cleanedText = cleanedText.replace(/[\u007F-\u009F]+/g, "").replace(/\s+/g, " ");
    
    // Step 4: Fix trailing commas before closing braces and brackets
    cleanedText = cleanedText
    .replace(/,\s*}/g, "}")  // Remove trailing commas before }
    .replace(/,\s*]/g, "]"); // Remove trailing commas before ]
    
    // Step 5: Parse and return the cleaned JSON
    return JSON.parse(cleanedText);
  } catch (error) {
    if (error instanceof Error) {
      console.error("Error parsing JSON:", error.message);
    } else {
      console.error("Error parsing JSON:", error);
    }
    return null;
  }
}

export function methodExists(obj: any, methodName: string): obj is { [key: string]: Function } {
  return typeof obj[methodName] === 'function';
}

export function polyRead(obj: any, methodOrProperty: string): any {
  if (methodExists(obj, methodOrProperty)) {
    return obj[methodOrProperty]();
  }

  if (methodOrProperty in obj) {
    return obj[methodOrProperty as keyof typeof obj];
  }

  // Fallback if invalid method and property
  return methodOrProperty;
}

export function isNotBlank(s: string|null): boolean {
  if (s === null) {
    return false;
  }
  const string = s.trim();
  return string !== '';
}

export function waitRandomSeconds(minSeconds:number = 1, maxSeconds:number = 2) {
  const randomDelay = Math.floor(Math.random() * (maxSeconds - minSeconds + 1) + minSeconds) * 1000;
  console.log(`Waiting ${randomDelay / 1000} seconds...`);
  return new Promise(resolve => setTimeout(resolve, randomDelay));
}

export function mapToObject(map:Map<string, any>): object {
  return Object.fromEntries(map);
}
export function objectToMap(obj:object): Map<string, any> {
  return new Map(Object.entries(obj));
}
/**
 * Parses a date string into a `moment.Moment` object.
 *
 * This function attempts to handle various date string formats, including:
 * - ISO format with timezone information (e.g., "2025-03-18 18:00:00 UTC").
 * - Month name format (e.g., "FEBRUARY 06 2025 10:30 AM").
 * - ISO format without timezone (e.g., "2024-12-17 15:45:00").
 * - Any other format that can be auto-parsed by the `moment` library.
 *
 * If the input string cannot be parsed into a valid date, the function logs an error
 * and returns `null`.
 *
 * @param dateString - The date string to parse.
 * @returns A `moment.Moment` object representing the parsed date, or `null` if parsing fails.
 */

export default function parseMomentFromString(
  dateString: string
): moment.Moment | null {
  // Normalize the input string
  const normalized = normalizeDateString(dateString);

  // ISO format with timezone information (2025-03-18 18:00:00 UTC...)
  if (normalized.includes("UTC")) {
    // Extract the date part before any timezone information
    const datePart = normalized.split("UTC")[0].trim();

    // Parse the ISO format
    return moment(datePart, "YYYY-MM-DD HH:mm:ss");
  }

  // Month name format (FEBRUARY 06 2025...)
  if (/[A-Z]+ \d{2} \d{4}/.test(normalized)) {
    // Extract parts
    const parts = normalized.split(" ");
    const month = parts[0];
    const day = parts[1];
    const year = parts[2];

    // Extract time if present
    let time = "00:00";
    if (parts.length > 3 && parts[3].includes(":")) {
      time = parts[3];
      // Handle AM/PM
      if (parts.length > 4 && (parts[4] === "PM" || parts[4] === "AM")) {
        time += " " + parts[4];
      }
    }

    // Combine and parse
    return moment(`${month} ${day} ${year} ${time}`, "MMMM DD YYYY h:mm A");
  }

  // ISO format without timezone (2024-12-17...)
  if (/^\d{4}-\d{2}-\d{2}/.test(normalized)) {
    return moment(
      normalized.split(" ")[0] + " " + normalized.split(" ")[1],
      "YYYY-MM-DD HH:mm:ss"
    );
  }

  // If all else fails, try moment's auto-parse
  const result = moment(dateString);

  // Check if parsing was successful
  if (!result.isValid()) {
    console.error(`Failed to parse date string: "${dateString}"`);
    return null;
  }

  return result;
}/**
 * Normalizes a date string by performing the following operations:
 * - Trims leading and trailing whitespace.
 * - Removes all non-alphanumeric characters except colons, spaces, and hyphens.
 * - Removes the prefix "Start:" if present.
 * - Converts the string to uppercase.
 * - Removes any occurrences of day names (e.g., "SUNDAY", "MONDAY", etc.).
 *
 * @param input - The input date string to normalize.
 * @returns The normalized date string.
 */
export function normalizeDateString(input: string): string {
  let dateString = input
    .trim()
    .replace(/[^:a-zA-Z0-9\s-]+/g, "")
    .replace("Start:", "")
    .toUpperCase();
  [
    "SUNDAY",
    "MONDAY",
    "TUESDAY",
    "WEDNESDAY",
    "THURSDAY",
    "FRIDAY",
    "SATURDAY",
  ].forEach((day) => {
    dateString = dateString.replace(day, "").trim();
  });
  return dateString;
}
export const cutoffForOldEvents = moment().subtract(MAX_DAYS_IN_PAST, 'days');
export const eventIsRelevant = (event: Event): boolean => !!event.start?.isAfter(cutoffForOldEvents);

