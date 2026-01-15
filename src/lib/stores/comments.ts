import { writable } from 'svelte/store';

export interface CustomComment {
  id: string;
  address: number;
  comment: string;
}

const STORAGE_KEY = 'disawsm_comments';

function loadComments(): CustomComment[] {
  if (typeof window === 'undefined') return [];

  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    console.error('Failed to load comments from localStorage:', error);
    return [];
  }
}

function saveComments(comments: CustomComment[]): void {
  if (typeof window === 'undefined') return;

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(comments));
  } catch (error) {
    console.error('Failed to save comments to localStorage:', error);
  }
}

function createCommentsStore() {
  const { subscribe, set, update } = writable<CustomComment[]>(loadComments());

  return {
    subscribe,

    setComment: (address: number, comment: string) => {
      update(comments => {
        const trimmed = comment.trim();

        // If empty, remove the comment
        if (!trimmed) {
          const updated = comments.filter(c => c.address !== address);
          saveComments(updated);
          return updated;
        }

        const existing = comments.find(c => c.address === address);
        let updated: CustomComment[];

        if (existing) {
          updated = comments.map(c =>
            c.address === address ? { ...c, comment: trimmed } : c
          );
        } else {
          const id = `comment-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
          updated = [...comments, { id, address, comment: trimmed }].sort((a, b) => a.address - b.address);
        }

        saveComments(updated);
        return updated;
      });
    },

    removeByAddress: (address: number) => {
      update(comments => {
        const updated = comments.filter(c => c.address !== address);
        saveComments(updated);
        return updated;
      });
    },

    clear: () => {
      saveComments([]);
      set([]);
    },

    load: (comments: CustomComment[]) => {
      saveComments(comments);
      set(comments);
    }
  };
}

export const customComments = createCommentsStore();
