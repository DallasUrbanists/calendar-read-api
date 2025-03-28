const _ = require('lodash');

/**
 * Calculates the similarity percentage between two strings using the Levenshtein Distance algorithm.
 * 
 * @param {string} str1 - The first string to compare.
 * @param {string} str2 - The second string to compare.
 * @returns {number} A number between 0 and 1 representing the similarity percentage.
 *                   1 indicates the strings are identical, and 0 indicates no similarity.
 */
function getSimilarityPercentage(str1, str2) {
  // Levenshtein Distance Algorithm
  function levenshteinDistance(s1, s2) {
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

function fuzzyMatch(str1, str2) {
  const normalize = str => _.toUpper(str.trim().replace(/[^a-zA-Z0-9 ]/g, '').replace(/\s+/g, ' '));
  const similarity = getSimilarityPercentage(normalize(str1), normalize(str2));

  return similarity > 0.8;
}

/**
 * Checks if a given location string is an alias for Dallas, TX.
 * Uses fuzzy matching to accommodate minor misspellings.
 * 
 * @param {string} location - The location string to check.
 * @returns {boolean} - True if the location is an alias of "Dallas, TX", false otherwise.
 */
function isJustDallas(string) {
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

/**
 * Extracts all text inside square brackets from a given string.
 * @param {string} inputString - The input string containing text in brackets.
 * @returns {Array} - An array of extracted strings from the brackets.
 */
function parseBrackets(inputString) {
  const matches = inputString.match(/\[([^\]]+)\]/g);
  return matches ? matches.map(match => match.slice(1, -1)) : [];
}

/**
 * Removes square brackets and the text within them from a given string.
 * @param {string} inputString - The input string containing text in brackets.
 * @returns {string} - The cleaned up string.
 */
function removeBrackets(inputString) {
  return inputString.replace(/\[.*?\]\s*/g, '').trim();
}

module.exports = {
  getSimilarityPercentage,
  fuzzyMatch,
  isJustDallas,
  parseBrackets,
  removeBrackets
};