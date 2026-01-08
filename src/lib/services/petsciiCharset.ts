/**
 * PETSCII Charset Loader
 * Loads C64 character set and creates a CSS sprite sheet for efficient rendering
 */

const CHARSET_URL = '/charset/c64-charset.bin';
const CACHE_KEY = 'petscii_sprite_sheet';

let cachedSpriteSheet: string | null = null;

/**
 * Loads the C64 charset and returns a sprite sheet data URL
 * Uses localStorage cache to avoid re-processing on subsequent loads
 */
export async function loadPetsciiCharset(): Promise<string> {
  // Return cached version if already loaded
  if (cachedSpriteSheet) {
    return cachedSpriteSheet;
  }

  // Try to load from localStorage cache
  try {
    const cached = localStorage.getItem(CACHE_KEY);
    if (cached) {
      cachedSpriteSheet = cached;
      return cached;
    }
  } catch (e) {
    // localStorage might not be available, continue without cache
  }

  // Load and process the charset
  const response = await fetch(CHARSET_URL);
  const arrayBuffer = await response.arrayBuffer();
  const bytes = new Uint8Array(arrayBuffer);

  if (bytes.length !== 2048) {
    throw new Error(`Invalid charset file size: ${bytes.length} bytes (expected 2048)`);
  }

  // Create sprite sheet
  const canvas = document.createElement('canvas');
  canvas.width = 128;  // 16 chars × 8 pixels
  canvas.height = 128; // 16 chars × 8 pixels

  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#00c698'; // DisAWSM primary color

  // Draw all 256 characters to sprite sheet
  for (let charIndex = 0; charIndex < 256; charIndex++) {
    const charOffset = charIndex * 8; // Each char is 8 bytes
    const gridX = charIndex % 16;
    const gridY = Math.floor(charIndex / 16);
    const offsetX = gridX * 8;
    const offsetY = gridY * 8;

    // Draw each pixel of the 8x8 character
    for (let y = 0; y < 8; y++) {
      const byte = bytes[charOffset + y];
      for (let x = 0; x < 8; x++) {
        if (byte & (1 << (7 - x))) {
          ctx.fillRect(offsetX + x, offsetY + y, 1, 1);
        }
      }
    }
  }

  // Convert to data URL
  const dataUrl = canvas.toDataURL();
  cachedSpriteSheet = dataUrl;

  // Cache in localStorage for faster subsequent loads
  try {
    localStorage.setItem(CACHE_KEY, dataUrl);
  } catch (e) {
    // localStorage might be full or disabled, continue without cache
  }

  return dataUrl;
}

/**
 * Gets the CSS background-position for a character code
 */
export function getPetsciiCharPosition(charCode: number): string {
  const gridX = charCode % 16;
  const gridY = Math.floor(charCode / 16);
  return `${-(gridX * 8)}px ${-(gridY * 8)}px`;
}
