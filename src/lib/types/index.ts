/**
 * Shared TypeScript type definitions
 */

export interface LoadedPRG {
  name: string;
  startAddress: number;
  bytes: Uint8Array;
}

export interface AppConfig {
  version: string;
  window_editor?: {
    left: number;
    top: number;
    closeable: boolean;
  };
  filename?: string;
  [key: string]: any;
}
