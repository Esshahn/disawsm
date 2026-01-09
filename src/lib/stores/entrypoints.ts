/**
 * Entrypoints Store
 * Manages markers that identify whether data should be treated as code or data
 */

import { writable } from 'svelte/store';

export type EntrypointType = 'code' | 'data';

export interface Entrypoint {
  id: string;
  address: number;
  type: EntrypointType;
}

function createEntrypointsStore() {
  const { subscribe, set, update } = writable<Entrypoint[]>([]);

  return {
    subscribe,

    /**
     * Add a new entrypoint
     */
    add: (address: number, type: EntrypointType) => {
      const id = `ep-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      update(entrypoints => {
        // Check if entrypoint at this address already exists
        const existing = entrypoints.find(ep => ep.address === address);
        if (existing) {
          // Update existing entrypoint type
          return entrypoints.map(ep =>
            ep.address === address ? { ...ep, type } : ep
          );
        }
        // Add new entrypoint and sort by address
        return [...entrypoints, { id, address, type }].sort((a, b) => a.address - b.address);
      });
    },

    /**
     * Remove an entrypoint by id
     */
    remove: (id: string) => {
      update(entrypoints => entrypoints.filter(ep => ep.id !== id));
    },

    /**
     * Update an entrypoint's address
     */
    updateAddress: (id: string, address: number) => {
      update(entrypoints => {
        return entrypoints
          .map(ep => ep.id === id ? { ...ep, address } : ep)
          .sort((a, b) => a.address - b.address);
      });
    },

    /**
     * Update an entrypoint's type
     */
    updateType: (id: string, type: EntrypointType) => {
      update(entrypoints =>
        entrypoints.map(ep => ep.id === id ? { ...ep, type } : ep)
      );
    },

    /**
     * Clear all entrypoints
     */
    clear: () => set([]),

    /**
     * Get entrypoint at specific address
     */
    getAtAddress: (address: number, entrypoints: Entrypoint[]): Entrypoint | undefined => {
      return entrypoints.find(ep => ep.address === address);
    }
  };
}

export const entrypoints = createEntrypointsStore();
