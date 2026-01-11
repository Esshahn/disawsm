/**
 * Settings Store - User Preferences
 * Handles application settings with localStorage persistence
 */

import { writable } from 'svelte/store';
import type { UserSettings } from '$lib/types';

const STORAGE_KEY = 'disawsm_settings';

// Default settings
const defaultSettings: UserSettings = {
  labelPrefix: '_',
  assemblerSyntax: 'acme'
};

/**
 * Load settings from localStorage
 */
function loadSettings(): UserSettings {
  if (typeof window === 'undefined') {
    return defaultSettings;
  }

  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      // Merge with defaults to ensure all properties exist
      return {
        ...defaultSettings,
        ...parsed
      };
    }
  } catch (error) {
    console.error('Failed to load settings from localStorage:', error);
  }

  return defaultSettings;
}

/**
 * Save settings to localStorage
 */
function saveSettings(settings: UserSettings): void {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch (error) {
    console.error('Failed to save settings to localStorage:', error);
  }
}

/**
 * Create settings store with auto-save
 */
function createSettingsStore() {
  const { subscribe, set, update } = writable<UserSettings>(loadSettings());

  return {
    subscribe,
    set: (value: UserSettings) => {
      saveSettings(value);
      set(value);
    },
    update: (updater: (settings: UserSettings) => UserSettings) => {
      update(current => {
        const newSettings = updater(current);
        saveSettings(newSettings);
        return newSettings;
      });
    },
    reset: () => {
      saveSettings(defaultSettings);
      set(defaultSettings);
    }
  };
}

export const settings = createSettingsStore();
