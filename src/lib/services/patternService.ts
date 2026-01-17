/**
 * Pattern Service
 * Loads and matches byte patterns to identify code sequences
 */

interface BytePattern {
  name: string;
  bytes: string[];
  description: string;
}

let patterns: BytePattern[] = [];
let patternsLoaded = false;

/**
 * Load patterns from JSON file (cached after first load)
 */
export async function loadPatterns(): Promise<void> {
  if (patternsLoaded) return;

  const response = await fetch('/json/patterns.json');
  const data = await response.json();
  patterns = data.patterns;
  patternsLoaded = true;
}

/**
 * Check if a pattern matches bytes at a given index
 */
function matchPattern(pattern: BytePattern, bytes: Uint8Array, startIndex: number): boolean {
  if (startIndex + pattern.bytes.length > bytes.length) {
    return false;
  }

  for (let i = 0; i < pattern.bytes.length; i++) {
    const patternByte = pattern.bytes[i];
    if (patternByte === '??') continue;

    const actualByte = bytes[startIndex + i].toString(16).padStart(2, '0');
    if (patternByte !== actualByte) {
      return false;
    }
  }

  return true;
}

/**
 * Find all byte indices that match any pattern
 */
export function findPatternMatches(bytes: Uint8Array): number[] {
  const matches: number[] = [];

  for (let i = 0; i < bytes.length; i++) {
    for (const pattern of patterns) {
      if (matchPattern(pattern, bytes, i)) {
        matches.push(i);
        break; // Only need one match per position
      }
    }
  }

  return matches;
}
