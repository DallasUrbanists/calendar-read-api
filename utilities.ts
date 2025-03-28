import _ from "lodash";

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