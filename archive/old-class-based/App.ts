import About from "./About";
import Storage from "./Storage";
import Window from "./Window";
import Editor from "./Editor";
import FileLoader, { LoadedPRG } from "./FileLoader";
import { get_config } from "./config";
import { dom } from "./helper";

declare global {
  interface Window {
    app: App;
  }
}

export class App {
  storage: any = {};
  window_about: any;
  about: any;
  window_settings: any;
  settings: any;
  window_editor: any;
  editor: any;
  fileLoader!: FileLoader;
  loadedFile: LoadedPRG | null = null;
  assemblyOutput: string | null = null;
  allow_keyboard_shortcuts!: boolean;

  constructor(public config) {
    this.initializeConfig();
    this.initializeFileLoader();
    this.initializeWindows();
    this.initializeState();
  }

  private initializeFileLoader(): void {
    this.fileLoader = new FileLoader();
  }

  private initializeConfig(): void {
    this.storage = new Storage(this.config);
    this.config = this.storage.get_config();
  }

  private initializeWindows(): void {
    // editor
    const editor_config = this.createWindowConfig("window_editor", "Editor", "sprite", 0, {
      closeable: this.config.window_editor.closeable,
      left: this.config.window_editor.left,
      top: this.config.window_editor.top,
    });
    this.window_editor = new Window(editor_config, this.store_window.bind(this));
    this.editor = new Editor(editor_config.window_id, this.config);

    // about
    const about_config = this.createWindowConfig("window_about", "About", "info", 4, {
      escape: true,
      modal: true,
      autoOpen: false,
      width: "680",
    });
    this.window_about = new Window(about_config);
    this.about = new About(about_config.window_id, this.config, {
      onLoad: this.regain_keyboard_controls.bind(this),
    });

  }

  private initializeState(): void {
    this.allow_keyboard_shortcuts = true;
    this.user_interaction();

    // Set initial status
    this.setStatus('Ready');

    // Initialize menu states
    this.updateMenuState();

    // Always open the editor window
    this.window_editor.open();

    // Show about window if this is an updated version
    if (this.storage.is_updated_version())
      this.window_about.open();
  }

  /**
   * Store window position/state to config and localStorage
   */
  store_window(obj) {
    for (const key in obj.data) {
      if (this.config[obj.name]?.hasOwnProperty(key))
        this.config[obj.name][key] = obj.data[key];
    }
    this.storage.write(this.config);
  }

  /**
   * Helper to create window config with common defaults
   */
  private createWindowConfig(
    name: string,
    title: string,
    type: string,
    windowId: number,
    options: {
      resizable?: boolean;
      closeable?: boolean;
      left?: number;
      top?: number;
      width?: number | string;
      height?: number | string;
      autoOpen?: boolean;
      modal?: boolean;
      escape?: boolean;
    } = {}
  ) {
    return {
      name,
      title,
      type,
      window_id: windowId,
      resizable: options.resizable ?? false,
      closeable: options.closeable,
      left: options.left,
      top: options.top,
      width: options.width ?? "auto",
      height: options.height ?? "auto",
      autoOpen: options.autoOpen,
      modal: options.modal,
      escape: options.escape,
    };
  }

  update_config() {
    this.storage.write(this.config);
    this.regain_keyboard_controls();
  }

  regain_keyboard_controls() {
    this.allow_keyboard_shortcuts = true;
  }

  user_interaction() {
    /*
      MENU INTERACTIONS
    */

    dom.sel("#menubar-info").onclick = () => {
      this.allow_keyboard_shortcuts = false;
      this.window_about.open();
    };

    dom.sel("#menubar-load-prg").onclick = async () => {
      await this.handleLoadPRG();
    };

    dom.sel("#menubar-save-asm").onclick = () => {
      this.handleSaveAssembly();
    };

    dom.sel("#menubar-clear").onclick = () => {
      this.handleClear();
    };

  }

  /**
   * Handle loading a PRG file
   */
  async handleLoadPRG(): Promise<void> {
    const loadedPRG = await this.fileLoader.selectAndLoadPRG();

    if (loadedPRG) {
      this.loadedFile = loadedPRG;
      this.assemblyOutput = null; // Clear previous assembly

      // Update status bar
      const statusMsg = `Loaded: ${loadedPRG.name} - Start: $${this.toHex(loadedPRG.startAddress, 4)} - Size: ${loadedPRG.bytes.length} bytes`;
      this.setStatus(statusMsg);

      // Update editor with loaded file
      this.editor.displayLoadedFile(loadedPRG);

      console.log('File loaded successfully:', loadedPRG);
    }
  }

  /**
   * Handle saving assembly output
   */
  handleSaveAssembly(): void {
    if (!this.assemblyOutput) {
      alert('No assembly output to save. Please disassemble a file first.');
      return;
    }

    // TODO: Implement file saving in Phase 5
    console.log('Save assembly - not yet implemented');
  }

  /**
   * Handle clearing the current file
   */
  handleClear(): void {
    if (this.loadedFile) {
      const confirmed = confirm('Clear the current file and all data?');
      if (confirmed) {
        this.loadedFile = null;
        this.assemblyOutput = null;
        this.editor.clear();
        this.setStatus('Ready');

        // Disable save menu
        this.updateMenuState();
      }
    }
  }

  /**
   * Update menu item states based on app state
   */
  updateMenuState(): void {
    const saveMenuItem = dom.sel("#menubar-save-asm");
    if (this.assemblyOutput) {
      saveMenuItem.classList.remove('disabled');
    } else {
      saveMenuItem.classList.add('disabled');
    }
  }

  /**
   * Set status bar message
   */
  setStatus(message: string): void {
    const statusText = dom.sel("#statustext");
    if (statusText) {
      statusText.textContent = message;
    }
  }

  /**
   * Convert number to hex string
   */
  private toHex(num: number, digits: number): string {
    return num.toString(16).padStart(digits, '0').toLowerCase();
  }
}

document.addEventListener("DOMContentLoaded", function () {
  window.app = new App(get_config());
});
