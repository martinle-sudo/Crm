import type { AppState } from '@/domain/types';
import type { Backend, Change, AuthUser, CrmUser } from './types';

interface RuntimeConfig {
  apiBase: string;
}

export const runtimeConfig: RuntimeConfig =
  (typeof window !== 'undefined' && (window as unknown as { __CRM_CONFIG__?: RuntimeConfig }).__CRM_CONFIG__) || {
    apiBase: '',
  };

export const isApiMode = (): boolean => !!runtimeConfig.apiBase;

const endpoint = (action: string): string =>
  `${runtimeConfig.apiBase.replace(/\/$/, '')}/index.php?action=${action}`;

let csrf = '';

async function call<T = unknown>(action: string, body?: unknown): Promise<T> {
  const res = await fetch(endpoint(action), {
    method: body === undefined ? 'GET' : 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(csrf ? { 'X-CRM-CSRF': csrf } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok) {
    const err = new Error((data.error as string) || `Erreur ${res.status}`) as Error & { status?: number };
    err.status = res.status;
    throw err;
  }
  return data as T;
}

// ── Authentification (utilisées par le store) ──────────────────────────
export async function apiMe(): Promise<AuthUser | null> {
  const data = await call<{ user: AuthUser | null; csrf?: string }>('me');
  if (data.csrf) csrf = data.csrf;
  return data.user;
}

export async function apiLogin(email: string, password: string): Promise<AuthUser> {
  const data = await call<{ user: AuthUser; csrf: string }>('login', { email, password });
  csrf = data.csrf;
  return data.user;
}

export async function apiLogout(): Promise<void> {
  await call('logout', {});
  csrf = '';
}

// ── Gestion des utilisateurs (admin) ──────────────────────────────────
export async function apiUsersList(): Promise<CrmUser[]> {
  const data = await call<{ users: CrmUser[] }>('users_list');
  return data.users;
}

export async function apiUsersUpsert(user: {
  id?: string; email: string; name: string; role: string; password?: string;
}): Promise<{ id?: string }> {
  return call('users_upsert', user);
}

export async function apiUsersToggle(id: string, active: boolean): Promise<void> {
  await call('users_toggle', { id, active });
}

// ── Synchronisation des données ────────────────────────────────────────
let queue: Promise<unknown> = Promise.resolve();

function enqueue(fn: () => Promise<unknown>): void {
  queue = queue.then(fn).catch((e) => {
    console.error('Échec de synchronisation avec le serveur :', e);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('crm-sync-error', { detail: (e as Error).message }));
    }
  });
}

export const apiBackend: Backend = {
  mode: 'api',

  loadState: async () => {
    const data = await call<{ state: AppState }>('state');
    return data.state ?? null;
  },

  sync: (changes: Change[]) => {
    for (const change of changes) {
      if (change.op === 'upsert') {
        enqueue(() => call('upsert', { entity: change.entity, record: change.record }));
      } else if (change.op === 'delete') {
        enqueue(() => call('delete', { entity: change.entity, id: change.id }));
      } else if (change.op === 'singleton') {
        enqueue(() => call('upsert', { entity: change.key, record: change.value }));
      }
    }
  },

  bulk: async (state: AppState) => {
    await call('bulk', { state });
  },
};
