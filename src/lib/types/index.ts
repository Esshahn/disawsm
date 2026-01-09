/**
 * Shared TypeScript type definitions
 */

export interface LoadedPRG {
  name: string;
  startAddress: number;
  bytes: Uint8Array;
}

/**
 * Window configuration settings
 */
export interface WindowConfig {
  left: number;
  top: number;
  width: number;
  height: number;
  autoOpen: boolean;
  closeable: boolean;
  isOpen: boolean;
  resizable: boolean;
}

/**
 * Application configuration (defaults from code)
 * This defines the default state of the application
 */
export interface AppConfig {
  version: string;
  default_filename: string;
  window_editor: WindowConfig;
  window_codeview: WindowConfig;
  window_info: WindowConfig;
}

/**
 * User configuration (persisted in localStorage)
 * Only contains user-adjustable settings
 */
export interface UserConfig {
  version: string;
  default_filename?: string;
  window_editor?: {
    left?: number;
    top?: number;
    width?: number;
    height?: number;
    isOpen?: boolean;
  };
  window_codeview?: {
    left?: number;
    top?: number;
    width?: number;
    height?: number;
    isOpen?: boolean;
  };
    window_info?: {
    left?: number;
    top?: number;
    width?: number;
    height?: number;
    isOpen?: boolean;
  };
}
