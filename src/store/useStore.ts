import { create } from 'zustand';
import { nanoid } from 'nanoid';
import type {
  AppState,
  Client,
  Service,
  Contract,
  Employee,
  Intervention,
  Invoice,
  Quote,
  Lead,
  Company,
  LeadStage,
  InterventionStatus,
} from '@/domain/types';
import { buildSeedState } from './seed';
import { todayISO, addDaysISO } from '@/domain/dates';
import { DEFAULT_GST, DEFAULT_QST } from '@/domain/quebec';
import { occurrenceDates, contractVisitAmount, contractVisitDuration } from '@/domain/scheduling';
import {
  backend, isApiMode, apiMe, apiLogin, apiLogout,
  ENTITY_NAMES, SINGLETON_NAMES, type Change, type AuthUser,
} from './backend';

const id = () => nanoid(10);

type AuthStatus = 'loading' | 'anon' | 'authed';

interface Actions {
  hydrated: boolean;
  auth: AuthStatus;
  authUser: AuthUser | null;
  syncError: string | null;

  hydrate: () => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  reset: () => Promise<void>;
  replaceState: (state: AppState) => void;
  toggleBlur: () => void;
  updateCompany: (patch: Partial<Company>) => void;

  upsertClient: (c: Omit<Client, 'id' | 'createdAt'> & { id?: string }) => string;
  removeClient: (id: string) => void;
  upsertService: (s: Omit<Service, 'id'> & { id?: string }) => string;
  removeService: (id: string) => void;
  upsertContract: (c: Omit<Contract, 'id' | 'createdAt'> & { id?: string }) => string;
  removeContract: (id: string) => void;
  generateInterventions: (contractId: string, untilDays?: number) => number;
  upsertEmployee: (e: Omit<Employee, 'id'> & { id?: string }) => string;
  removeEmployee: (id: string) => void;
  upsertIntervention: (i: Omit<Intervention, 'id' | 'createdAt'> & { id?: string }) => string;
  removeIntervention: (id: string) => void;
  setInterventionStatus: (id: string, status: InterventionStatus) => void;
  toggleChecklistItem: (interventionId: string, itemId: string) => void;
  upsertInvoice: (i: Omit<Invoice, 'id' | 'createdAt' | 'number'> & { id?: string; number?: string }) => string;
  removeInvoice: (id: string) => void;
  markInvoicePaid: (id: string, method: Invoice['paymentMethod']) => void;
  invoiceFromIntervention: (interventionId: string) => string | null;
  upsertQuote: (q: Omit<Quote, 'id' | 'createdAt' | 'number'> & { id?: string; number?: string }) => string;
  removeQuote: (id: string) => void;
  convertQuoteToContract: (quoteId: string) => string | null;
  upsertLead: (l: Omit<Lead, 'id' | 'createdAt'> & { id?: string }) => string;
  removeLead: (id: string) => void;
  setLeadStage: (id: string, stage: LeadStage) => void;
}

type Store = AppState & Actions;

const defaultCompany: Company = {
  name: 'Solutions Plan B',
  defaultGstRate: DEFAULT_GST,
  defaultQstRate: DEFAULT_QST,
};

function freshState(): AppState {
  return {
    schemaVersion: 1,
    profile: { currency: 'CAD', locale: 'fr-CA' },
    company: defaultCompany,
    preferences: { privacy: { blurAmounts: false } },
    counters: { invoice: 0, quote: 0 },
    clients: {}, services: {}, contracts: {}, employees: {},
    interventions: {}, invoices: {}, quotes: {}, leads: {},
  };
}

/** Complète un état (potentiellement partiel, venant du serveur) avec les défauts. */
function withDefaults(s: Partial<AppState>): AppState {
  const base = freshState();
  return {
    schemaVersion: 1,
    profile: s.profile ?? base.profile,
    company: s.company ?? base.company,
    preferences: s.preferences ?? base.preferences,
    counters: s.counters ?? base.counters,
    clients: s.clients ?? {},
    services: s.services ?? {},
    contracts: s.contracts ?? {},
    employees: s.employees ?? {},
    interventions: s.interventions ?? {},
    invoices: s.invoices ?? {},
    quotes: s.quotes ?? {},
    leads: s.leads ?? {},
  };
}

export const useStore = create<Store>((set, get) => ({
  ...freshState(),
  hydrated: false,
  auth: 'loading',
  authUser: null,
  syncError: null,

  hydrate: async () => {
    // Remonte les erreurs de synchro serveur dans l'UI.
    if (typeof window !== 'undefined') {
      window.addEventListener('crm-sync-error', (e) => {
        set({ syncError: (e as CustomEvent).detail as string });
      });
    }

    if (isApiMode()) {
      try {
        const user = await apiMe();
        if (!user) {
          set({ auth: 'anon', hydrated: true });
          return;
        }
        const state = await backend.loadState();
        set({ ...withDefaults(state ?? {}), authUser: user, auth: 'authed', hydrated: true });
      } catch {
        set({ auth: 'anon', hydrated: true });
      }
      return;
    }

    // Mode local : IndexedDB, avec données de démo au premier lancement.
    const persisted = await backend.loadState();
    if (persisted) {
      set({ ...persisted, auth: 'authed', hydrated: true });
    } else {
      const seed = buildSeedState();
      set({ ...seed, auth: 'authed', hydrated: true });
      void backend.bulk(seed);
    }
  },

  login: async (email, password) => {
    const user = await apiLogin(email, password); // lève une erreur si échec
    const state = await backend.loadState();
    set({ ...withDefaults(state ?? {}), authUser: user, auth: 'authed', syncError: null });
  },

  logout: async () => {
    try {
      await apiLogout();
    } finally {
      set({ ...freshState(), auth: 'anon', authUser: null });
    }
  },

  reset: async () => {
    const seed = buildSeedState();
    await backend.bulk(seed);
    set({ ...seed, auth: get().auth === 'anon' ? 'authed' : get().auth, hydrated: true });
  },

  replaceState: (state) => {
    set({ ...withDefaults(state), hydrated: true });
    void backend.bulk(withDefaults(state));
  },

  toggleBlur: () =>
    persist(set, get, (s) => ({
      preferences: { privacy: { blurAmounts: !s.preferences.privacy.blurAmounts } },
    })),

  updateCompany: (patch) =>
    persist(set, get, (s) => ({ company: { ...s.company, ...patch } })),

  // ── Clients ─────────────────────────────────────────────
  upsertClient: (c) => {
    const cid = c.id ?? id();
    persist(set, get, (s) => ({
      clients: {
        ...s.clients,
        [cid]: {
          ...(s.clients[cid] ?? { createdAt: todayISO() }),
          ...c,
          id: cid,
          createdAt: s.clients[cid]?.createdAt ?? todayISO(),
        } as Client,
      },
    }));
    return cid;
  },
  removeClient: (cid) => persist(set, get, (s) => omit(s.clients, cid, 'clients')),

  // ── Services ────────────────────────────────────────────
  upsertService: (svc) => {
    const sid = svc.id ?? id();
    persist(set, get, (s) => ({
      services: { ...s.services, [sid]: { ...svc, id: sid } as Service },
    }));
    return sid;
  },
  removeService: (sid) => persist(set, get, (s) => omit(s.services, sid, 'services')),

  // ── Contracts ───────────────────────────────────────────
  upsertContract: (c) => {
    const cid = c.id ?? id();
    persist(set, get, (s) => ({
      contracts: {
        ...s.contracts,
        [cid]: {
          ...c,
          id: cid,
          createdAt: s.contracts[cid]?.createdAt ?? todayISO(),
        } as Contract,
      },
    }));
    return cid;
  },
  removeContract: (cid) => persist(set, get, (s) => omit(s.contracts, cid, 'contracts')),

  generateInterventions: (contractId, untilDays = 30) => {
    const s = get();
    const contract = s.contracts[contractId];
    if (!contract) return 0;
    const from = todayISO();
    const to = addDaysISO(from, untilDays);
    const dates = occurrenceDates(contract, from, to);
    const existing = new Set(
      Object.values(s.interventions)
        .filter((i) => i.contractId === contractId)
        .map((i) => i.date),
    );
    const amount = contractVisitAmount(contract, s.services);
    const duration = contractVisitDuration(contract, s.services);
    const created: Record<string, Intervention> = {};
    let n = 0;
    for (const date of dates) {
      if (existing.has(date)) continue;
      const iid = id();
      created[iid] = {
        id: iid, clientId: contract.clientId, contractId: contract.id, date,
        startTime: contract.startTime, durationMin: duration, status: 'planned',
        serviceIds: contract.serviceIds, assignedEmployeeIds: contract.assignedEmployeeIds,
        checklist: [], amount, photos: [], createdAt: todayISO(),
      };
      n++;
    }
    if (n > 0) {
      persist(set, get, (st) => ({ interventions: { ...st.interventions, ...created } }));
    }
    return n;
  },

  // ── Employees ───────────────────────────────────────────
  upsertEmployee: (e) => {
    const eid = e.id ?? id();
    persist(set, get, (s) => ({
      employees: { ...s.employees, [eid]: { ...e, id: eid } as Employee },
    }));
    return eid;
  },
  removeEmployee: (eid) => persist(set, get, (s) => omit(s.employees, eid, 'employees')),

  // ── Interventions ───────────────────────────────────────
  upsertIntervention: (i) => {
    const iid = i.id ?? id();
    persist(set, get, (s) => ({
      interventions: {
        ...s.interventions,
        [iid]: {
          ...i,
          id: iid,
          createdAt: s.interventions[iid]?.createdAt ?? todayISO(),
        } as Intervention,
      },
    }));
    return iid;
  },
  removeIntervention: (iid) =>
    persist(set, get, (s) => omit(s.interventions, iid, 'interventions')),
  setInterventionStatus: (iid, status) =>
    persist(set, get, (s) => {
      const iv = s.interventions[iid];
      if (!iv) return {};
      return { interventions: { ...s.interventions, [iid]: { ...iv, status } } };
    }),
  toggleChecklistItem: (iid, itemId) =>
    persist(set, get, (s) => {
      const iv = s.interventions[iid];
      if (!iv) return {};
      return {
        interventions: {
          ...s.interventions,
          [iid]: {
            ...iv,
            checklist: iv.checklist.map((c) =>
              c.id === itemId ? { ...c, done: !c.done } : c,
            ),
          },
        },
      };
    }),

  // ── Invoices ────────────────────────────────────────────
  upsertInvoice: (inv) => {
    const iid = inv.id ?? id();
    const cur = get();
    let number = inv.number ?? cur.invoices[iid]?.number;
    let counter = cur.counters.invoice;
    if (!number) {
      counter += 1;
      number = `F-2026-${String(counter).padStart(4, '0')}`;
    }
    persist(set, get, (s) => ({
      counters: { ...s.counters, invoice: counter },
      invoices: {
        ...s.invoices,
        [iid]: {
          ...inv,
          id: iid,
          number: number!,
          createdAt: s.invoices[iid]?.createdAt ?? todayISO(),
        } as Invoice,
      },
    }));
    return iid;
  },
  removeInvoice: (iid) => persist(set, get, (s) => omit(s.invoices, iid, 'invoices')),
  markInvoicePaid: (iid, method) =>
    persist(set, get, (s) => {
      const inv = s.invoices[iid];
      if (!inv) return {};
      return {
        invoices: {
          ...s.invoices,
          [iid]: { ...inv, status: 'paid', paidDate: todayISO(), paymentMethod: method },
        },
      };
    }),
  invoiceFromIntervention: (interventionId) => {
    const s = get();
    const iv = s.interventions[interventionId];
    if (!iv || iv.invoiceId) return iv?.invoiceId ?? null;
    const lines = iv.serviceIds.map((sid) => {
      const svc = s.services[sid];
      return { id: id(), label: svc?.name ?? 'Service', qty: 1, unitPrice: svc?.unitPrice ?? 0 };
    });
    if (lines.length === 0) lines.push({ id: id(), label: 'Intervention', qty: 1, unitPrice: iv.amount });
    const counter = s.counters.invoice + 1;
    const invId = id();
    const number = `F-2026-${String(counter).padStart(4, '0')}`;
    persist(set, get, (st) => ({
      counters: { ...st.counters, invoice: counter },
      invoices: {
        ...st.invoices,
        [invId]: {
          id: invId, number, clientId: iv.clientId, contractId: iv.contractId,
          issueDate: todayISO(), dueDate: addDaysISO(todayISO(), 30), lines,
          gstRate: st.company.defaultGstRate, qstRate: st.company.defaultQstRate,
          status: 'draft', createdAt: todayISO(),
        },
      },
      interventions: {
        ...st.interventions,
        [interventionId]: { ...st.interventions[interventionId], invoiceId: invId },
      },
    }));
    return invId;
  },

  // ── Quotes ──────────────────────────────────────────────
  upsertQuote: (q) => {
    const qid = q.id ?? id();
    const cur = get();
    let number = q.number ?? cur.quotes[qid]?.number;
    let counter = cur.counters.quote;
    if (!number) {
      counter += 1;
      number = `S-2026-${String(counter).padStart(4, '0')}`;
    }
    persist(set, get, (s) => ({
      counters: { ...s.counters, quote: counter },
      quotes: {
        ...s.quotes,
        [qid]: {
          ...q,
          id: qid,
          number: number!,
          createdAt: s.quotes[qid]?.createdAt ?? todayISO(),
        } as Quote,
      },
    }));
    return qid;
  },
  removeQuote: (qid) => persist(set, get, (s) => omit(s.quotes, qid, 'quotes')),
  convertQuoteToContract: (quoteId) => {
    const s = get();
    const q = s.quotes[quoteId];
    if (!q || q.convertedContractId) return q?.convertedContractId ?? null;
    let clientId = q.clientId;
    const newRecords: Partial<AppState> = {};
    if (!clientId) {
      clientId = id();
      newRecords.clients = {
        ...s.clients,
        [clientId]: {
          id: clientId, name: q.prospectName ?? 'Nouveau client', type: 'commercial',
          status: 'active', tags: [], createdAt: todayISO(),
        },
      };
    }
    const contractId = id();
    const contract: Contract = {
      id: contractId, clientId, title: `Contrat — ${q.number}`, frequency: 'monthly',
      weekday: 2, startTime: '09:00', startDate: todayISO(), status: 'active',
      autoRenew: true, serviceIds: [], assignedEmployeeIds: [], createdAt: todayISO(),
      amountOverride: q.lines.reduce((sum, l) => sum + l.qty * l.unitPrice, 0),
      notes: `Converti depuis la soumission ${q.number}.`,
    };
    persist(set, get, (st) => ({
      ...newRecords,
      contracts: { ...st.contracts, [contractId]: contract },
      quotes: {
        ...st.quotes,
        [quoteId]: { ...st.quotes[quoteId], status: 'accepted', convertedContractId: contractId, clientId },
      },
    }));
    return contractId;
  },

  // ── Leads ───────────────────────────────────────────────
  upsertLead: (l) => {
    const lid = l.id ?? id();
    persist(set, get, (s) => ({
      leads: {
        ...s.leads,
        [lid]: {
          ...l,
          id: lid,
          createdAt: s.leads[lid]?.createdAt ?? todayISO(),
        } as Lead,
      },
    }));
    return lid;
  },
  removeLead: (lid) => persist(set, get, (s) => omit(s.leads, lid, 'leads')),
  setLeadStage: (lid, stage) =>
    persist(set, get, (s) => {
      const l = s.leads[lid];
      if (!l) return {};
      return { leads: { ...s.leads, [lid]: { ...l, stage } } };
    }),
}));

// ── Helpers ───────────────────────────────────────────────
function omit<K extends keyof AppState>(
  record: Record<string, unknown>,
  key: string,
  field: K,
): Partial<AppState> {
  const next = { ...record };
  delete next[key];
  return { [field]: next } as unknown as Partial<AppState>;
}

/**
 * Applique un patch en mémoire, calcule les changements (diff par référence)
 * et les pousse au backend (IndexedDB en local, MySQL via PHP en mode serveur).
 */
function persist(
  set: (partial: Partial<Store>) => void,
  get: () => Store,
  updater: (state: Store) => Partial<AppState>,
) {
  const current = get();
  const patch = updater(current);
  set(patch);
  const before = stripActions(current);
  const after = stripActions({ ...current, ...patch } as Store);
  backend.sync(diffChanges(before, after), after);
}

function diffChanges(before: AppState, after: AppState): Change[] {
  const changes: Change[] = [];
  for (const entity of ENTITY_NAMES) {
    const b = before[entity] as Record<string, { id: string }>;
    const a = after[entity] as Record<string, { id: string }>;
    if (b === a) continue;
    for (const key in a) {
      if (a[key] !== b[key]) changes.push({ op: 'upsert', entity, record: a[key] });
    }
    for (const key in b) {
      if (!(key in a)) changes.push({ op: 'delete', entity, id: key });
    }
  }
  for (const key of SINGLETON_NAMES) {
    if (before[key] !== after[key]) changes.push({ op: 'singleton', key, value: after[key] });
  }
  return changes;
}

function stripActions(s: Store): AppState {
  const {
    schemaVersion, profile, company, preferences, counters,
    clients, services, contracts, employees, interventions, invoices, quotes, leads,
  } = s;
  return {
    schemaVersion, profile, company, preferences, counters,
    clients, services, contracts, employees, interventions, invoices, quotes, leads,
  };
}
