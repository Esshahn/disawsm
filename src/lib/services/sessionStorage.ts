/**
 * Session Storage Service
 * Auto-saves and restores the current disassembly session to localStorage
 */

import type { ProjectFile } from '$lib/types';

const SESSION_STORAGE_KEY = 'disawsm_session';

/**
 * Save current session to localStorage
 */
export function saveSession(
  name: string,
  startAddress: number,
  bytes: Uint8Array,
  entrypoints: Array<{ address: number; type: 'code' | 'data' }>
): void {
  try {
    const sessionData: ProjectFile = {
      version: '1.0',
      name,
      startAddress,
      bytes: Array.from(bytes),
      entrypoints
    };

    localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(sessionData));
  } catch (error) {
    console.error('Failed to save session to localStorage:', error);
  }
}

/**
 * Load session from localStorage
 */
export function loadSession(): {
  name: string;
  startAddress: number;
  bytes: Uint8Array;
  entrypoints: Array<{ address: number; type: 'code' | 'data' }>;
} | null {
  try {
    const json = localStorage.getItem(SESSION_STORAGE_KEY);
    if (!json) return null;

    const sessionData: ProjectFile = JSON.parse(json);

    // Validate session data
    if (!sessionData.version || !sessionData.name || !sessionData.bytes) {
      return null;
    }

    return {
      name: sessionData.name,
      startAddress: sessionData.startAddress,
      bytes: new Uint8Array(sessionData.bytes),
      entrypoints: sessionData.entrypoints || []
    };
  } catch (error) {
    console.error('Failed to load session from localStorage:', error);
    return null;
  }
}

/**
 * Clear saved session from localStorage
 */
export function clearSession(): void {
  try {
    localStorage.removeItem(SESSION_STORAGE_KEY);
  } catch (error) {
    console.error('Failed to clear session from localStorage:', error);
  }
}

/**
 * Check if there's a saved session
 */
export function hasSession(): boolean {
  try {
    return localStorage.getItem(SESSION_STORAGE_KEY) !== null;
  } catch (error) {
    return false;
  }
}
