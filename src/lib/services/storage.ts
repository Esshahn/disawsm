import { status } from "$lib/utils/dom";
import type { AppConfig, UserConfig } from "$lib/types";

// handles writing and reading of the local html5 storage in the browser

export default class Storage {
  is_new_version: boolean;
  config: AppConfig;
  userConfig: UserConfig | null = null;

  constructor(appConfig: AppConfig) {
    this.config = appConfig;
    this.is_new_version = false; // will be true if the storage config has an older version number
    this.init();
  }

  /**
   * Compares two version strings/numbers safely.
   * Handles both old numeric versions (e.g., 1.51) and new date-based versions (e.g., "25.12.27").
   * @param configVersion - The version from the config (current version)
   * @param storageVersion - The version from localStorage (stored version)
   * @returns true if configVersion is newer than storageVersion
   */
  private isNewerVersion(configVersion: string | number, storageVersion: string | number): boolean {
    // If storage version is undefined or null, config is newer
    if (storageVersion === undefined || storageVersion === null) {
      return true;
    }

    // Convert both to strings for consistent comparison
    const configStr = String(configVersion);
    const storageStr = String(storageVersion);

    // Check if config version is in date format (YY.MM.DD or YY.MM.DD.patch)
    const isDateFormat = /^\d{2}\.\d{2}\.\d{2}(\.\d+)?$/.test(configStr);

    if (isDateFormat) {
      // If storage is old numeric format (e.g., 1.51), config is definitely newer
      if (typeof storageVersion === 'number' || /^\d+\.\d+$/.test(storageStr)) {
        return true;
      }

      // Both are date format, compare as dates
      // Format: YY.MM.DD.patch -> convert to YYMMDDpatch for numeric comparison
      const configDate = parseInt(configStr.replace(/\./g, ''), 10);
      const storageDate = parseInt(storageStr.replace(/\./g, ''), 10);

      return configDate > storageDate;
    } else {
      // Fallback to numeric comparison for legacy versions
      const configNum = parseFloat(configStr);
      const storageNum = parseFloat(storageStr);

      return configNum > storageNum;
    }
  }

  init() {
    if (typeof Storage !== "undefined") {
      try {
        // Read stored user config (if it exists)
        const storedConfigString = localStorage.getItem("disawsm_userconfig");

        if (!storedConfigString) {
          // No stored config exists, create initial user config
          const initialUserConfig: UserConfig = {
            version: this.config.version,
            default_filename: this.config.default_filename
          };
          this.writeUserConfig(initialUserConfig);
          this.is_new_version = true;
          return;
        }

        // Parse stored user config
        this.userConfig = JSON.parse(storedConfigString);

        // Check if app version has been updated
        if (this.isNewerVersion(this.config.version, this.userConfig!.version)) {
          this.is_new_version = true;
          // Update version in user config
          this.userConfig!.version = this.config.version;
        }

        // Merge user config into app config
        // ONLY merge user-adjustable properties (position, size, isOpen)
        // NOT functional properties (closeable, resizable, autoOpen)

        if (this.userConfig!.window_monitor) {
          const userWindow = this.userConfig!.window_monitor;
          if (userWindow.left !== undefined) this.config.window_monitor.left = userWindow.left;
          if (userWindow.top !== undefined) this.config.window_monitor.top = userWindow.top;
          if (userWindow.width !== undefined) this.config.window_monitor.width = userWindow.width;
          if (userWindow.height !== undefined) this.config.window_monitor.height = userWindow.height;
          if (userWindow.isOpen !== undefined) this.config.window_monitor.isOpen = userWindow.isOpen;
        }

        if (this.userConfig!.window_info) {
          const userWindow = this.userConfig!.window_info;
          if (userWindow.left !== undefined) this.config.window_info.left = userWindow.left;
          if (userWindow.top !== undefined) this.config.window_info.top = userWindow.top;
          if (userWindow.width !== undefined) this.config.window_info.width = userWindow.width;
          if (userWindow.height !== undefined) this.config.window_info.height = userWindow.height;
          if (userWindow.isOpen !== undefined) this.config.window_info.isOpen = userWindow.isOpen;
        }

        if (this.userConfig!.window_entrypoints) {
          const userWindow = this.userConfig!.window_entrypoints;
          if (userWindow.left !== undefined) this.config.window_entrypoints.left = userWindow.left;
          if (userWindow.top !== undefined) this.config.window_entrypoints.top = userWindow.top;
          if (userWindow.width !== undefined) this.config.window_entrypoints.width = userWindow.width;
          if (userWindow.height !== undefined) this.config.window_entrypoints.height = userWindow.height;
          if (userWindow.isOpen !== undefined) this.config.window_entrypoints.isOpen = userWindow.isOpen;
        }

        if (this.userConfig!.window_disassembler) {
          const userWindow = this.userConfig!.window_disassembler;
          if (userWindow.left !== undefined) this.config.window_disassembler.left = userWindow.left;
          if (userWindow.top !== undefined) this.config.window_disassembler.top = userWindow.top;
          if (userWindow.width !== undefined) this.config.window_disassembler.width = userWindow.width;
          if (userWindow.height !== undefined) this.config.window_disassembler.height = userWindow.height;
          if (userWindow.isOpen !== undefined) this.config.window_disassembler.isOpen = userWindow.isOpen;
        }

        if (this.userConfig!.default_filename) {
          this.config.default_filename = this.userConfig!.default_filename;
        }

        // Save merged config back to localStorage
        this.writeUserConfig(this.userConfig!);

      } catch (error) {
        console.error("Failed to initialize storage:", error);
        status("Unable to access settings storage. Using defaults.");
        // this.config already has default values from constructor
      }
    } else {
      // can't access storage on the browser
      status("Local storage is not available in your browser.");
    }
  }

  /**
   * Writes user config to localStorage
   */
  writeUserConfig(userConfig: UserConfig) {
    if (typeof Storage !== "undefined") {
      try {
        localStorage.setItem("disawsm_userconfig", JSON.stringify(userConfig));
      } catch (error) {
        console.error("Failed to save user settings:", error);
        status("Unable to save settings. Storage may be full or disabled.");
      }
    } else {
      status("I can't write to local web storage.");
    }
  }

  /**
   * Updates specific user config properties and saves to localStorage
   */
  updateUserConfig(updates: Partial<UserConfig>) {
    if (!this.userConfig) {
      this.userConfig = {
        version: this.config.version
      };
    }

    // Deep merge for nested properties
    if (updates.window_monitor) {
      this.userConfig.window_monitor = {
        ...this.userConfig.window_monitor,
        ...updates.window_monitor
      };
    }

    // Deep merge for nested properties
    if (updates.window_info) {
      this.userConfig.window_info = {
        ...this.userConfig.window_info,
        ...updates.window_info
      };
    }

    // Deep merge for nested properties
    if (updates.window_entrypoints) {
      this.userConfig.window_entrypoints = {
        ...this.userConfig.window_entrypoints,
        ...updates.window_entrypoints
      };
    }

    // Deep merge for nested properties
    if (updates.window_disassembler) {
      this.userConfig.window_disassembler = {
        ...this.userConfig.window_disassembler,
        ...updates.window_disassembler
      };
    }

    if (updates.default_filename !== undefined) {
      this.userConfig.default_filename = updates.default_filename;
    }

    this.writeUserConfig(this.userConfig);
  }

  /**
   * Legacy write method - now writes to user config
   */
  write(data: AppConfig) {
    const userConfig: UserConfig = {
      version: data.version,
      default_filename: data.default_filename,
      window_monitor: {
        left: data.window_monitor.left,
        top: data.window_monitor.top,
        width: data.window_monitor.width,
        height: data.window_monitor.height,
        isOpen: data.window_monitor.isOpen
      },
      window_info: {
        left: data.window_info.left,
        top: data.window_info.top,
        width: data.window_info.width,
        height: data.window_info.height,
        isOpen: data.window_info.isOpen
      },
      window_entrypoints: {
        left: data.window_entrypoints.left,
        top: data.window_entrypoints.top,
        width: data.window_entrypoints.width,
        height: data.window_entrypoints.height,
        isOpen: data.window_entrypoints.isOpen
      },
      window_disassembler: {
        left: data.window_disassembler.left,
        top: data.window_disassembler.top,
        width: data.window_disassembler.width,
        height: data.window_disassembler.height,
        isOpen: data.window_disassembler.isOpen
      }
    };
    this.writeUserConfig(userConfig);
  }

  /**
   * Legacy read method - returns merged config
   */
  read(): AppConfig {
    return this.config;
  }

  is_updated_version() {
    return this.is_new_version;
  }

  get_config() {
    return this.config;
  }

  /**
   * Writes data to local storage for auto-save functionality
   * @param data - The complete data object 
   */
  write_local_data(data: any) {
    if (typeof Storage !== "undefined") {
      try {
        const dataToSave = {
          timestamp: new Date().toISOString(),
          data: data
        };
        localStorage.setItem("disawsm_autosave", JSON.stringify(dataToSave));
      } catch (error) {
        console.error("Failed to auto-save prite data:", error);
        // Don't show status message for auto-save failures to avoid spamming user
      }
    }
  }

  /**
   * Reads auto-saved sprite data from local storage
   * @returns The data object or null if none exists
   */
  read_local_data() {
    if (typeof Storage !== "undefined") {
      try {
        const saved = localStorage.getItem("disawsm_autosave");
        if (saved) {
          const parsed = JSON.parse(saved);
          return parsed.data; 
        }
        return null;
      } catch (error) {
        console.error("Failed to read auto-saved data:", error);
        return null;
      }
    }
    return null;
  }


  /**
   * Gets the timestamp of the last auto-save
   * @returns ISO timestamp string or null if no auto-save exists
   */
  get_autosave_timestamp() {
    if (typeof Storage !== "undefined") {
      try {
        const saved = localStorage.getItem("disawsm_autosave");
        if (saved) {
          const parsed = JSON.parse(saved);
          return parsed.timestamp;
        }
      } catch (error) {
        console.error("Failed to read auto-save timestamp:", error);
      }
    }
    return null;
  }
}
