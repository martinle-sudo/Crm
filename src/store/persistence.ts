import { get, set, del } from 'idb-keyval';
import type { AppState } from '@/domain/types';

const DB_KEY = 'cashflow-state-v1';

export async function loadState(): Promise<AppState | null> {
  try {
    const raw = await get<AppState>(DB_KEY);
    if (!raw) return null;
    if (raw.schemaVersion !== 1) return null;
    return raw;
  } catch (err) {
    console.warn('Failed to load state from IndexedDB', err);
    return null;
  }
}

export async function saveState(state: AppState): Promise<void> {
  await set(DB_KEY, state);
}

export async function clearState(): Promise<void> {
  await del(DB_KEY);
}
