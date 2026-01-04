import About from "./About";
import Settings from "./Settings";
import Storage from "./Storage";
import Window from "./Window";
import Editor from "./Editor";
import { get_config } from "./config";
import { dom, toggle_fullscreen } from "./helper";

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
  allow_keyboard_shortcuts!: boolean;

  constructor(public config) {
    this.initializeConfig();
    this.initializeWindows();
    this.initializeState();
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

    // settings
    const settings_config = this.createWindowConfig("window_settings", "Settings", "settings", 6, {
      modal: true,
      escape: true,
      autoOpen: false,
      width: "760",
    });
    this.window_settings = new Window(settings_config);
    this.settings = new Settings(settings_config.window_id, this.config, {
      onLoad: this.update_config.bind(this),
    });
  }

  private initializeState(): void {
    this.allow_keyboard_shortcuts = true;
    this.user_interaction();

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

    dom.sel("#menubar-settings").onclick = () => {
      this.allow_keyboard_shortcuts = false;
      this.window_settings.open();
    };

    dom.sel("#menubar-fullscreen").onclick = () => {
      toggle_fullscreen();
    };
  }
}

document.addEventListener("DOMContentLoaded", function () {
  window.app = new App(get_config());
});
