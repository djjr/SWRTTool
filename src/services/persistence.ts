import type { PersistedState } from '../types/taxonomy';

const STORAGE_KEY = 'swrt-taxonomy-v1';

export interface PersistenceAdapter {
  load(): Promise<PersistedState | null>;
  save(state: PersistedState): Promise<void>;
}

export const localStorageAdapter: PersistenceAdapter = {
  load: async () => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      return JSON.parse(raw) as PersistedState;
    } catch {
      return null;
    }
  },
  save: async (state) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // Storage quota exceeded or similar — silently skip
    }
  },
};

export function exportStateToFile(state: PersistedState, filename = 'taxonomy.json'): void {
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function importStateFromFile(): Promise<PersistedState | null> {
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json,application/json';
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) { resolve(null); return; }
      try {
        const text = await file.text();
        const parsed = JSON.parse(text) as PersistedState;
        // Basic validation
        if (
          parsed &&
          typeof parsed === 'object' &&
          'nodes' in parsed &&
          'rootIds' in parsed &&
          'typeVocabulary' in parsed
        ) {
          resolve(parsed);
        } else {
          resolve(null);
        }
      } catch {
        resolve(null);
      }
    };
    input.click();
  });
}
