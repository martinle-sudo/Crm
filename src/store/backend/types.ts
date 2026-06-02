import type { AppState } from '@/domain/types';

export const ENTITY_NAMES = [
  'clients', 'services', 'contracts', 'employees',
  'interventions', 'invoices', 'quotes', 'leads',
] as const;
export type EntityName = (typeof ENTITY_NAMES)[number];

export const SINGLETON_NAMES = ['company', 'preferences', 'profile', 'counters'] as const;
export type SingletonName = (typeof SINGLETON_NAMES)[number];

export type Change =
  | { op: 'upsert'; entity: EntityName; record: { id: string } }
  | { op: 'delete'; entity: EntityName; id: string }
  | { op: 'singleton'; key: SingletonName; value: unknown };

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: string;
}

export interface Backend {
  mode: 'local' | 'api';
  /** Charge l'état complet, ou null si vide / non authentifié. */
  loadState: () => Promise<AppState | null>;
  /** Pousse une liste de changements + l'état complet courant. */
  sync: (changes: Change[], fullState: AppState) => void;
  /** Remplace toutes les données (import / reset). */
  bulk: (state: AppState) => Promise<void>;
}
