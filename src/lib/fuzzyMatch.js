/**
 * Fuzzy answer matching for the Pokémon quiz.
 *
 * Strategy:
 *   1. Normalise both strings (lowercase, trim, strip non-alphanumeric).
 *   2. Accept immediately if they are identical (fast path).
 *   3. Compute the Levenshtein edit distance.
 *   4. Allow up to MAX_ERRORS mistakes, scaling with the name's length so
 *      short names (e.g. "Mew", 3 chars) stay strict while long names
 *      (e.g. "Victreebel", 10 chars) allow 2 typos.
 *
 * Thresholds (based on normalised name length):
 *   1–3 chars  → 0 errors allowed  (too short to guess fuzzily)
 *   4–5 chars  → 1 error allowed
 *   6+  chars  → 2 errors allowed
 */

const normalise = (str) =>
  str.toLowerCase().trim().replace(/[^a-z0-9]/g, '')

function levenshtein(a, b) {
  const m = a.length
  const n = b.length
  // Use two rolling rows to keep memory O(n)
  let prev = Array.from({ length: n + 1 }, (_, i) => i)
  let curr = new Array(n + 1)

  for (let i = 1; i <= m; i++) {
    curr[0] = i
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1
      curr[j] = Math.min(
        prev[j] + 1,       // deletion
        curr[j - 1] + 1,   // insertion
        prev[j - 1] + cost // substitution
      )
    }
    ;[prev, curr] = [curr, prev]
  }
  return prev[n]
}

function maxErrors(nameLength) {
  if (nameLength <= 3) return 0
  if (nameLength <= 5) return 1
  return 2
}

/**
 * Returns true if the user's answer is close enough to the correct name.
 * @param {string} userAnswer
 * @param {string} correctName
 */
export function isAnswerCorrect(userAnswer, correctName) {
  const a = normalise(userAnswer)
  const b = normalise(correctName)
  if (!a) return false
  if (a === b) return true
  const dist = levenshtein(a, b)
  return dist <= maxErrors(b.length)
}
