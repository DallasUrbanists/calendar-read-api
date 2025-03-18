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

module.exports = {
  getSimilarityPercentage
};