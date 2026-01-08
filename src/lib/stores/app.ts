/**
 * Svelte Stores - Global State Management
 * Replaces the old window.app pattern with reactive stores
 */

import { writable, derived } from 'svelte/store';
import type { LoadedPRG, AppConfig } from '$lib/types';
import { get_config } from '$lib/config';

// Application state stores
export const loadedFile = writable<LoadedPRG | null>(null);
export const assemblyOutput = writable<string | null>(null);

// Derived stores (automatically computed from other stores)
export const status = derived(
  loadedFile,
  ($loadedFile) => {
    if ($loadedFile) {
      const startHex = $loadedFile.startAddress.toString(16).padStart(4, '0');
      return `Loaded: ${$loadedFile.name} - Start: $${startHex} - Size: ${$loadedFile.bytes.length} bytes`;
    }
    return 'Ready';
  }
);

export const saveDisabled = derived(
  assemblyOutput,
  ($assemblyOutput) => !$assemblyOutput
);

// Configuration store (for window positions, settings, etc.)
// Initialize with defaults from config/index.ts immediately
// This will be updated in App.svelte after merging with localStorage
export const config = writable<AppConfig>(get_config());

// Storage reference (will be set by App.svelte after Storage is initialized)
let storageInstance: any = null;

export function setStorageInstance(storage: any) {
  storageInstance = storage;
}

/**
 * Updates window configuration and persists to localStorage
 * @param windowKey - The window key (e.g., 'window_editor')
 * @param updates - Partial window config to update
 */
export function updateWindowConfig(windowKey: string, updates: Partial<any>) {
  config.update(cfg => {
    const newConfig = {
      ...cfg,
      [windowKey]: {
        ...cfg[windowKey],
        ...updates
      }
    };

    // Save to localStorage immediately
    if (storageInstance) {
      storageInstance.write(newConfig);
    }

    return newConfig;
  });
}
