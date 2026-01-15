/**
 * Project File Service
 * Handles saving and loading .dis project files
 */

import type { ProjectFile } from '$lib/types';
import type { Entrypoint } from '$lib/stores/entrypoints';
import type { CustomLabel } from '$lib/stores/labels';

const PROJECT_VERSION = '1.1';

/**
 * Save current session as a .dis project file
 */
export function saveProject(
  name: string,
  startAddress: number,
  bytes: Uint8Array,
  entrypoints: Entrypoint[],
  customLabels: CustomLabel[] = []
): void {
  const projectData: ProjectFile = {
    version: PROJECT_VERSION,
    name,
    startAddress,
    bytes: Array.from(bytes),
    entrypoints: entrypoints.map(ep => ({
      address: ep.address,
      type: ep.type
    })),
    labels: customLabels.map(label => ({
      address: label.address,
      name: label.name
    }))
  };

  const json = JSON.stringify(projectData, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');

  // Generate filename: remove .prg extension if present, add .dis
  const baseName = name.toLowerCase().endsWith('.prg')
    ? name.slice(0, -4)
    : name;

  link.href = url;
  link.download = `${baseName}.dis`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Load a .dis project file
 */
export async function loadProject(file: File): Promise<{
  name: string;
  startAddress: number;
  bytes: Uint8Array;
  entrypoints: Array<{ address: number; type: 'code' | 'data' }>;
  labels: Array<{ address: number; name: string }>;
}> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const json = e.target?.result as string;
        const projectData: ProjectFile = JSON.parse(json);

        // Validate project file format
        if (!projectData.version || !projectData.name || !projectData.bytes) {
          reject(new Error('Invalid project file format'));
          return;
        }

        // Convert bytes array back to Uint8Array
        const bytes = new Uint8Array(projectData.bytes);

        resolve({
          name: projectData.name,
          startAddress: projectData.startAddress,
          bytes,
          entrypoints: projectData.entrypoints || [],
          labels: projectData.labels || []
        });
      } catch (error) {
        reject(new Error('Failed to parse project file: ' + (error as Error).message));
      }
    };

    reader.onerror = () => {
      reject(new Error('Failed to read project file'));
    };

    reader.readAsText(file);
  });
}
