import { writable } from 'svelte/store';

export interface CustomLabel {
  address: number;
  name: string;
}

// Shared validation for label names
export const LABEL_NAME_REGEX = /^[a-zA-Z_][a-zA-Z0-9_-]*$/;
export const LABEL_NAME_ERROR = 'Invalid label name. Must start with a letter or underscore and contain only alphanumeric characters, underscores, and hyphens.';

export function isValidLabelName(name: string): boolean {
  return LABEL_NAME_REGEX.test(name.trim());
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
        if (!name.trim() || !isValidLabelName(name)) {
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
          updated = [...labels, { address, name }].sort((a, b) => a.address - b.address);
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
