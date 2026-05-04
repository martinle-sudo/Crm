import { create } from 'zustand';
import { nanoid } from 'nanoid';
import type {
  AppState,
  RecurringRule,
  Scenario,
  Transaction,
  ISODate,
  RuleException,
  Preferences,
} from '@/domain/types';
import { buildSeedState } from './seed';
import {
  buildStateFromOnboarding,
  type OnboardingForm,
} from '@/features/onboarding/buildState';
import { loadState, saveState, clearState as clearPersistence } from './persistence';

interface StoreActions {
  hydrated: boolean;
  needsOnboarding: boolean;
  hydrate: () => Promise<void>;
  reset: () => Promise<void>;
  useDemoData: () => void;
  completeOnboarding: (form: OnboardingForm) => void;

  setOpeningBalance: (amount: number) => void;
  setStressThresholds: (t: Preferences['stressThresholds']) => void;

  addTransaction: (tx: Omit<Transaction, 'id'>) => string;
  updateTransaction: (id: string, patch: Partial<Transaction>) => void;
  removeTransaction: (id: string) => void;

  addRecurring: (rule: Omit<RecurringRule, 'id' | 'exceptions'>) => string;
  updateRecurring: (id: string, patch: Partial<RecurringRule>) => void;
  removeRecurring: (id: string) => void;
  setRuleException: (
    ruleId: string,
    originalDate: ISODate,
    exception: RuleException | null,
  ) => void;

  upsertScenario: (scenario: Scenario) => void;
  removeScenario: (id: string) => void;
  toggleScenario: (id: string) => void;
}

type Store = AppState & StoreActions;

let saveTimer: ReturnType<typeof setTimeout> | null = null;
const scheduleSave = (state: AppState) => {
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    void saveState(state);
  }, 200);
};

const emptyState: AppState = {
  schemaVersion: 1,
  profile: {
    currency: 'CAD',
    locale: 'fr-CA',
    openingBalance: 0,
    openingDate: new Date().toISOString().slice(0, 10),
    createdAt: new Date().toISOString().slice(0, 10),
  },
  transactions: {},
  recurringRules: {},
  scenarios: {},
  categories: {},
  preferences: {
    theme: 'dark',
    accent: 'neon-violet',
    stressThresholds: { critical: 100, warning: 500, comfortable: 2000 },
    timeline: { defaultHorizonDays: 90, maxHorizonDays: 730 },
    privacy: { blurAmounts: false },
  },
};

export const useStore = create<Store>((set, get) => ({
  ...emptyState,
  hydrated: false,
  needsOnboarding: false,

  hydrate: async () => {
    const persisted = await loadState();
    if (persisted) {
      set({ ...persisted, hydrated: true, needsOnboarding: false });
    } else {
      // No persisted state: keep empty state in memory and let the
      // onboarding wizard collect real data (or skip with demo).
      set({ ...emptyState, hydrated: true, needsOnboarding: true });
    }
  },

  reset: async () => {
    await clearPersistence();
    set({ ...emptyState, hydrated: true, needsOnboarding: true });
  },

  useDemoData: () => {
    const seed = buildSeedState();
    set({ ...seed, needsOnboarding: false });
    void saveState(seed);
  },

  completeOnboarding: (form) => {
    const built = buildStateFromOnboarding(form);
    set({ ...built, needsOnboarding: false });
    void saveState(built);
  },

  setOpeningBalance: (amount) =>
    persist(set, get, (s) => ({
      profile: { ...s.profile, openingBalance: amount },
    })),

  setStressThresholds: (t) =>
    persist(set, get, (s) => ({
      preferences: { ...s.preferences, stressThresholds: t },
    })),

  addTransaction: (tx) => {
    const id = nanoid(10);
    persist(set, get, (s) => ({
      transactions: { ...s.transactions, [id]: { ...tx, id } },
    }));
    return id;
  },
  updateTransaction: (id, patch) =>
    persist(set, get, (s) => {
      const existing = s.transactions[id];
      if (!existing) return {};
      return {
        transactions: { ...s.transactions, [id]: { ...existing, ...patch } },
      };
    }),
  removeTransaction: (id) =>
    persist(set, get, (s) => {
      const next = { ...s.transactions };
      delete next[id];
      return { transactions: next };
    }),

  addRecurring: (rule) => {
    const id = nanoid(10);
    const full: RecurringRule = { ...rule, id, exceptions: {} };
    persist(set, get, (s) => ({
      recurringRules: { ...s.recurringRules, [id]: full },
    }));
    return id;
  },
  updateRecurring: (id, patch) =>
    persist(set, get, (s) => {
      const existing = s.recurringRules[id];
      if (!existing) return {};
      return {
        recurringRules: {
          ...s.recurringRules,
          [id]: { ...existing, ...patch },
        },
      };
    }),
  removeRecurring: (id) =>
    persist(set, get, (s) => {
      const next = { ...s.recurringRules };
      delete next[id];
      return { recurringRules: next };
    }),
  setRuleException: (ruleId, originalDate, exception) =>
    persist(set, get, (s) => {
      const rule = s.recurringRules[ruleId];
      if (!rule) return {};
      const exceptions = { ...rule.exceptions };
      if (exception === null) delete exceptions[originalDate];
      else exceptions[originalDate] = exception;
      return {
        recurringRules: {
          ...s.recurringRules,
          [ruleId]: { ...rule, exceptions },
        },
      };
    }),

  upsertScenario: (scenario) =>
    persist(set, get, (s) => ({
      scenarios: { ...s.scenarios, [scenario.id]: scenario },
    })),
  removeScenario: (id) =>
    persist(set, get, (s) => {
      const next = { ...s.scenarios };
      delete next[id];
      return { scenarios: next };
    }),
  toggleScenario: (id) =>
    persist(set, get, (s) => {
      const sc = s.scenarios[id];
      if (!sc) return {};
      return {
        scenarios: {
          ...s.scenarios,
          [id]: { ...sc, active: !sc.active },
        },
      };
    }),
}));

function persist(
  set: (partial: Partial<Store>) => void,
  get: () => Store,
  updater: (state: Store) => Partial<AppState>,
) {
  const current = get();
  const patch = updater(current);
  const next: Store = { ...current, ...patch };
  set(patch);
  scheduleSave(stripActions(next));
}

function stripActions(s: Store): AppState {
  const {
    schemaVersion,
    profile,
    transactions,
    recurringRules,
    scenarios,
    categories,
    preferences,
  } = s;
  return {
    schemaVersion,
    profile,
    transactions,
    recurringRules,
    scenarios,
    categories,
    preferences,
  };
}

/** Selector helper: pure AppState slice without actions, memoised by reference. */
export const selectAppState = (s: Store): AppState => ({
  schemaVersion: s.schemaVersion,
  profile: s.profile,
  transactions: s.transactions,
  recurringRules: s.recurringRules,
  scenarios: s.scenarios,
  categories: s.categories,
  preferences: s.preferences,
});
