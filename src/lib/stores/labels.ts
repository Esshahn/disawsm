import { writable } from 'svelte/store';

export interface CustomLabel {
  id: string;
  address: number;
  name: string;
}

const STORAGE_KEY = 'disawsm_labels';

function loadLabels(): CustomLabel[] {
  if (typeof window === 'undefined') return [];

  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    console.error('Failed to load labels from localStorage:', error);
    return [];
  }
}

function saveLabels(labels: CustomLabel[]): void {
  if (typeof window === 'undefined') return;

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(labels));
  } catch (error) {
    console.error('Failed to save labels to localStorage:', error);
  }
}

function createLabelsStore() {
  const { subscribe, set, update } = writable<CustomLabel[]>(loadLabels());

  return {
    subscribe,

    setLabel: (address: number, name: string) => {
      update(labels => {
        if (!name.trim() || !/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(name)) {
          console.warn('Invalid label name:', name);
          return labels;
        }

        const existing = labels.find(label => label.address === address);
        let updated: CustomLabel[];

        if (existing) {
          updated = labels.map(label =>
            label.address === address ? { ...label, name } : label
          );
        } else {
          const id = `label-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
          updated = [...labels, { id, address, name }].sort((a, b) => a.address - b.address);
        }

        saveLabels(updated);
        return updated;
      });
    },

    removeByAddress: (address: number) => {
      update(labels => {
        const updated = labels.filter(label => label.address !== address);
        saveLabels(updated);
        return updated;
      });
    },

    clear: () => {
      saveLabels([]);
      set([]);
    },

    load: (labels: CustomLabel[]) => {
      saveLabels(labels);
      set(labels);
    }
  };
}

export const customLabels = createLabelsStore();
