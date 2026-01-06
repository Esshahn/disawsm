import { dom } from "./helper";
import { LoadedPRG } from "./FileLoader";

export default class Editor {
  private contentDiv: HTMLElement | null = null;

  constructor(public window: number, public config) {
    this.config = config;
    this.window = window;

    const template = `
      <div id="editor-content" style="padding: 20px;">
        <h2>No file loaded</h2>
        <p>Use File > Load PRG to load a program file.</p>
      </div>
    `;

    dom.append("#window-" + this.window, template);
    this.contentDiv = document.querySelector("#editor-content");
  }

  /**
   * Display a loaded PRG file
   * For now, shows basic info. Will implement hex viewer in Phase 2
   */
  displayLoadedFile(loadedPRG: LoadedPRG): void {
    if (!this.contentDiv) return;

    const template = `
      <div style="padding: 20px;">
        <h2>File Loaded: ${loadedPRG.name}</h2>
        <p>Start Address: $${this.toHex(loadedPRG.startAddress, 4)}</p>
        <p>Size: ${loadedPRG.bytes.length} bytes</p>
        <p>End Address: $${this.toHex(loadedPRG.startAddress + loadedPRG.bytes.length - 1, 4)}</p>
        <hr>
        <p><em>Hex viewer will be implemented in Phase 2</em></p>
        <div style="margin-top: 20px;">
          <strong>First 16 bytes:</strong><br>
          <code style="font-family: monospace; background: #333; padding: 10px; display: block; margin-top: 5px;">
            ${this.formatFirstBytes(loadedPRG.bytes, loadedPRG.startAddress)}
          </code>
        </div>
      </div>
    `;

    this.contentDiv.innerHTML = template;
  }

  /**
   * Clear the editor display
   */
  clear(): void {
    if (!this.contentDiv) return;

    this.contentDiv.innerHTML = `
      <h2>No file loaded</h2>
      <p>Use File > Load PRG to load a program file.</p>
    `;
  }

  /**
   * Format first 16 bytes for preview
   */
  private formatFirstBytes(bytes: Uint8Array, startAddr: number): string {
    const count = Math.min(16, bytes.length);
    let result = this.toHex(startAddr, 4) + ':  ';

    for (let i = 0; i < count; i++) {
      result += this.toHex(bytes[i], 2) + ' ';
      if ((i + 1) % 4 === 0) result += ' ';
    }

    return result;
  }

  /**
   * Convert number to hex string
   */
  private toHex(num: number, digits: number): string {
    return num.toString(16).padStart(digits, '0').toLowerCase();
  }
}
