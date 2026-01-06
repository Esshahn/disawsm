/**
 * FileLoader - Handles PRG file loading via HTML5 File API
 */

export interface LoadedPRG {
  name: string;
  startAddress: number;
  bytes: Uint8Array;
}

export default class FileLoader {
  private fileInput: HTMLInputElement;

  constructor() {
    this.fileInput = document.createElement('input');
    this.fileInput.type = 'file';
    this.fileInput.accept = '.prg,.bin';
    this.fileInput.style.display = 'none';
    document.body.appendChild(this.fileInput);
  }

  /**
   * Open file picker and load a PRG file
   * Returns a Promise that resolves with the loaded file data
   */
  async selectAndLoadPRG(): Promise<LoadedPRG | null> {
    return new Promise((resolve) => {
      this.fileInput.onchange = async (e: Event) => {
        const target = e.target as HTMLInputElement;
        const file = target.files?.[0];

        if (!file) {
          resolve(null);
          return;
        }

        try {
          const loadedPRG = await this.readPRG(file);
          resolve(loadedPRG);
        } catch (error) {
          console.error('Error loading PRG file:', error);
          alert(`Error loading file: ${error.message}`);
          resolve(null);
        }

        // Reset input so same file can be loaded again
        this.fileInput.value = '';
      };

      // Trigger file picker
      this.fileInput.click();
    });
  }

  /**
   * Read and parse a PRG file
   */
  private async readPRG(file: File): Promise<LoadedPRG> {
    // Validate file
    this.validatePRG(file);

    // Read file as ArrayBuffer
    const arrayBuffer = await file.arrayBuffer();
    const bytes = new Uint8Array(arrayBuffer);

    if (bytes.length < 2) {
      throw new Error('Invalid PRG file: File too small (minimum 2 bytes for start address)');
    }

    // Extract start address (first 2 bytes, little-endian)
    const startAddress = this.extractStartAddress(bytes);

    // Remove first 2 bytes to get actual program data
    const programBytes = bytes.slice(2);

    console.log(`Loaded PRG: ${file.name}`);
    console.log(`Start address: $${this.toHex(startAddress, 4)}`);
    console.log(`Program size: ${programBytes.length} bytes`);

    return {
      name: file.name,
      startAddress,
      bytes: programBytes
    };
  }

  /**
   * Extract start address from first 2 bytes (little-endian)
   * Example: bytes [00, c0] = $c000
   */
  private extractStartAddress(bytes: Uint8Array): number {
    return bytes[0] | (bytes[1] << 8);
  }

  /**
   * Validate PRG file
   */
  private validatePRG(file: File): void {
    // Check file size (max 64KB for 6502)
    const maxSize = 64 * 1024; // 64KB
    if (file.size > maxSize) {
      throw new Error(`File too large: ${file.size} bytes (max ${maxSize} bytes)`);
    }

    if (file.size < 2) {
      throw new Error('File too small to be a valid PRG file');
    }
  }

  /**
   * Convert number to hex string
   */
  private toHex(num: number, digits: number): string {
    return num.toString(16).padStart(digits, '0').toLowerCase();
  }
}
