/**
 * PETSCII Charset Loader
 * Loads C64 character set and creates a CSS sprite sheet for efficient rendering
 */

// Import the charset file - Vite will handle this as a URL
import charsetUrl from '../../charset/c64-charset.bin?url';

export class PetsciiCharset {
  private spriteSheetUrl: string | null = null;
  private isLoaded = false;

  /**
   * Loads the C64 charset from binary file and creates a sprite sheet
   * @returns Promise that resolves to the sprite sheet data URL
   */
  async load(): Promise<string> {
    if (this.spriteSheetUrl) {
      return this.spriteSheetUrl;
    }

    try {
      // Fetch the charset binary file using Vite's asset handling
      const response = await fetch(charsetUrl);
      const arrayBuffer = await response.arrayBuffer();
      const bytes = new Uint8Array(arrayBuffer);

      // Validate file size (should be 2048 bytes = 256 chars × 8 bytes)
      if (bytes.length !== 2048) {
        throw new Error(`Invalid charset file size: ${bytes.length} bytes (expected 2048)`);
      }

      // Convert charset bytes to character bitmaps
      const charset = this.convertCharset(bytes);

      // Create sprite sheet canvas (16×16 grid of 8×8 characters = 128×128 pixels)
      const spriteSheet = this.createSpriteSheet(charset);

      // Convert to data URL for CSS usage
      this.spriteSheetUrl = spriteSheet.toDataURL();
      this.isLoaded = true;

      return this.spriteSheetUrl;
    } catch (error) {
      console.error('Failed to load PETSCII charset:', error);
      throw error;
    }
  }

  /**
   * Converts binary charset data into 2D array of character bitmaps
   * @param bytes - Uint8Array containing the charset binary data
   * @returns Array of 256 characters, each an array of 8 rows (binary strings)
   */
  private convertCharset(bytes: Uint8Array): string[][] {
    const charset: string[][] = [];
    let charBytes: string[] = [];
    let lineCounter = 0;

    for (let i = 0; i < bytes.length; i++) {
      // Convert byte to 8-bit binary string
      const binary = bytes[i].toString(2).padStart(8, '0');
      charBytes.push(binary);

      lineCounter++;
      if (lineCounter === 8) {
        charset.push(charBytes);
        charBytes = [];
        lineCounter = 0;
      }
    }

    return charset;
  }

  /**
   * Creates a sprite sheet canvas with all 256 characters
   * Arranged in a 16×16 grid, each character is 8×8 pixels
   * @param charset - Array of character bitmaps
   * @returns Canvas element containing the sprite sheet
   */
  private createSpriteSheet(charset: string[][]): HTMLCanvasElement {
    const canvas = document.createElement('canvas');
    const charsPerRow = 16;
    const charSize = 8;
    const sheetSize = charsPerRow * charSize; // 128×128

    canvas.width = sheetSize;
    canvas.height = sheetSize;

    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Failed to get canvas 2D context');
    }

    // Use C64 green color for characters
    ctx.fillStyle = '#00c698'; // Using DisAWSM primary color

    // Draw each character to the sprite sheet
    charset.forEach((charBitmap, charIndex) => {
      const gridX = charIndex % charsPerRow;
      const gridY = Math.floor(charIndex / charsPerRow);
      const offsetX = gridX * charSize;
      const offsetY = gridY * charSize;

      // Draw each pixel of the character
      for (let y = 0; y < 8; y++) {
        for (let x = 0; x < 8; x++) {
          if (charBitmap[y][x] === '1') {
            ctx.fillRect(offsetX + x, offsetY + y, 1, 1);
          }
        }
      }
    });

    return canvas;
  }

  /**
   * Gets the CSS background-position for a specific character code
   * @param charCode - Character code (0-255)
   * @returns CSS background-position string
   */
  getCharPosition(charCode: number): string {
    const charsPerRow = 16;
    const charSize = 8;

    const gridX = charCode % charsPerRow;
    const gridY = Math.floor(charCode / charsPerRow);

    const x = -(gridX * charSize);
    const y = -(gridY * charSize);

    return `${x}px ${y}px`;
  }

  /**
   * Gets the sprite sheet data URL
   * @returns Data URL or null if not loaded
   */
  getSpriteSheetUrl(): string | null {
    return this.spriteSheetUrl;
  }

  /**
   * Checks if the charset is loaded
   */
  isCharsetLoaded(): boolean {
    return this.isLoaded;
  }
}

// Singleton instance
export const petsciiCharset = new PetsciiCharset();
