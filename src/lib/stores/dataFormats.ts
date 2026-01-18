import { writable } from 'svelte/store';

export type DataFormatType = 'byte' | 'text';

export interface DataFormat {
  address: number;
  format: DataFormatType;
}

const STORAGE_KEY = 'disawsm_dataformats';

function loadDataFormats(): DataFormat[] {
  if (typeof window === 'undefined') return [];

  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    console.error('Failed to load data formats from localStorage:', error);
    return [];
  }
}

function saveDataFormats(formats: DataFormat[]): void {
  if (typeof window === 'undefined') return;

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(formats));
  } catch (error) {
    console.error('Failed to save data formats to localStorage:', error);
  }
}

function createDataFormatsStore() {
  const { subscribe, set, update } = writable<DataFormat[]>(loadDataFormats());

  return {
    subscribe,

    setFormat: (address: number, format: DataFormatType) => {
      update(formats => {
        const existing = formats.find(f => f.address === address);
        let updated: DataFormat[];

        if (existing) {
          updated = formats.map(f =>
            f.address === address ? { ...f, format } : f
          );
        } else {
          updated = [...formats, { address, format }].sort((a, b) => a.address - b.address);
        }

        saveDataFormats(updated);
        return updated;
      });
    },

    removeByAddress: (address: number) => {
      update(formats => {
        const updated = formats.filter(f => f.address !== address);
        saveDataFormats(updated);
        return updated;
      });
    },

    clear: () => {
      saveDataFormats([]);
      set([]);
    },

    load: (formats: DataFormat[]) => {
      saveDataFormats(formats);
      set(formats);
    }
  };
}

export const customDataFormats = createDataFormatsStore();
