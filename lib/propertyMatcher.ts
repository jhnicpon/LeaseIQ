/**
 * Fuzzy address matching for property grouping.
 *
 * Strategy:
 * 1. Normalize the address (lowercase, strip punctuation, collapse whitespace, remove
 *    common unit/suite prefixes that cause false negatives).
 * 2. Compute trigram-based Dice coefficient similarity between two normalized strings.
 * 3. Match if similarity ≥ SIMILARITY_THRESHOLD (0.72 by default).
 *
 * Also provides helpers to extract city/state from a full address string.
 */

export const SIMILARITY_THRESHOLD = 0.72;

/** Strip punctuation, normalize whitespace, lowercase. */
export function normalizeAddress(address: string): string {
  return address
    .toLowerCase()
    // Remove unit/suite qualifiers so "Suite 200" vs "Ste 200" aren't blockers
    .replace(/\b(suite|ste|unit|apt|floor|fl|bldg|building|#)\s*\.?\s*\w+/g, '')
    .replace(/[^\w\s]/g, ' ') // punctuation → space
    .replace(/\s+/g, ' ')
    .trim();
}

/** Build a set of all trigrams for a string. */
function trigrams(s: string): Set<string> {
  const set = new Set<string>();
  const padded = `  ${s}  `;
  for (let i = 0; i < padded.length - 2; i++) {
    set.add(padded.slice(i, i + 3));
  }
  return set;
}

/** Sørensen–Dice coefficient between two strings using trigrams. 0 = no overlap, 1 = identical. */
export function similarity(a: string, b: string): number {
  if (a === b) return 1;
  if (a.length < 3 || b.length < 3) return 0;
  const tA = trigrams(a);
  const tB = trigrams(b);
  let intersection = 0;
  for (const t of tA) {
    if (tB.has(t)) intersection++;
  }
  return (2 * intersection) / (tA.size + tB.size);
}

/** Returns true if two normalized addresses are similar enough to be the same property. */
export function isSameProperty(normA: string, normB: string): boolean {
  return similarity(normA, normB) >= SIMILARITY_THRESHOLD;
}

/** Extract city from a typical US address: "123 Main St, Dallas, TX 75201" → "Dallas" */
export function extractCity(address: string): string {
  const parts = address.split(',').map(p => p.trim());
  if (parts.length >= 3) return parts[parts.length - 2];
  if (parts.length === 2) {
    // Might be "City, ST 12345"
    const last = parts[1].replace(/\d{5}(-\d{4})?$/, '').trim();
    const stateParts = last.split(/\s+/);
    if (stateParts.length >= 2) return stateParts.slice(0, -1).join(' ');
    return parts[0];
  }
  return '';
}

/** Extract state abbreviation from a US address. */
export function extractState(address: string): string {
  const match = address.match(/\b([A-Z]{2})\s*\d{5}/);
  return match ? match[1] : '';
}

/**
 * Given a new address and a list of existing properties (with normalized_address),
 * return the best-matching property id or null if none meets the threshold.
 */
export function findMatchingProperty(
  normalizedNewAddress: string,
  properties: { id: string; normalized_address: string }[],
): string | null {
  let bestId: string | null = null;
  let bestScore = SIMILARITY_THRESHOLD - 0.001; // must exceed threshold

  for (const prop of properties) {
    const score = similarity(normalizedNewAddress, prop.normalized_address);
    if (score > bestScore) {
      bestScore = score;
      bestId = prop.id;
    }
  }
  return bestId;
}
