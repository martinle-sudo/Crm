import type { AppState } from '@/domain/types';
import type { Backend, Change } from './types';
import { loadState, saveState } from '../persistence';

// Mode local : tout est sauvegardé dans IndexedDB. Les « changes » sont
// ignorés individuellement ; on persiste simplement l'état complet (debounce).
let timer: ReturnType<typeof setTimeout> | null = null;

export const localBackend: Backend = {
  mode: 'local',
  loadState: () => loadState(),
  sync: (_changes: Change[], fullState: AppState) => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => void saveState(fullState), 200);
  },
  bulk: async (state: AppState) => {
    await saveState(state);
  },
};
