/**
 * Svelte Stores - Global State Management
 * Replaces the old window.app pattern with reactive stores
 */

import { writable, derived } from 'svelte/store';
import type { LoadedPRG, AppConfig } from '$lib/types';

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
export const config = writable<AppConfig>({
  version: "26.01.04",
  window_editor: {
    left: 50,
    top: 50,
    closeable: false
  },
  filename: "mycode"
});
