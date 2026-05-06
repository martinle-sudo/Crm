import { addDays, format, startOfMonth } from 'date-fns';
import type { AppState, Category, RecurringRule, Transaction } from '@/domain/types';
import { todayISO } from '@/domain/dates';

const iso = (d: Date) => format(d, 'yyyy-MM-dd');

const cat = (
  id: string,
  name: string,
  icon: string,
  color: string,
  type: Category['type'],
): Category => ({ id, name, icon, color, type });

export function buildSeedState(): AppState {
  const now = new Date();
  const monthStart = startOfMonth(now);

  const categories: Record<string, Category> = Object.fromEntries(
    [
      cat('cat-salary', 'Salaire', 'briefcase', '#6ee7b7', 'income'),
      cat('cat-rent', 'Loyer', 'home', '#fda4af', 'fixed'),
      cat('cat-groceries', 'Épicerie', 'shopping-basket', '#67e8f9', 'variable'),
      cat('cat-transport', 'Transport', 'car', '#fcd34d', 'variable'),
      cat('cat-subscription', 'Abonnement', 'repeat', '#a78bfa', 'fixed'),
      cat('cat-utilities', 'Services', 'plug', '#f0abfc', 'fixed'),
      cat('cat-leisure', 'Loisirs', 'sparkles', '#f9a8d4', 'variable'),
      cat('cat-savings', 'Épargne', 'piggy-bank', '#a7f3d0', 'fixed'),
    ].map((c) => [c.id, c]),
  );

  const rules: RecurringRule[] = [
    {
      id: 'rule-salary',
      kind: 'income',
      label: 'Salaire',
      amount: 2350,
      categoryId: 'cat-salary',
      // Bi-weekly Friday — anchored on the 1st Friday after monthStart.
      rrule: 'FREQ=WEEKLY;INTERVAL=2;BYDAY=FR',
      startDate: iso(addDays(monthStart, ((5 - monthStart.getDay() + 7) % 7))),
      exceptions: {},
    },
    {
      id: 'rule-rent',
      kind: 'expense',
      label: 'Loyer',
      amount: -1450,
      categoryId: 'cat-rent',
      rrule: 'FREQ=MONTHLY;BYMONTHDAY=1',
      startDate: iso(monthStart),
      exceptions: {},
    },
    {
      id: 'rule-hydro',
      kind: 'expense',
      label: 'Hydro',
      amount: -82,
      categoryId: 'cat-utilities',
      rrule: 'FREQ=MONTHLY;BYMONTHDAY=15',
      startDate: iso(monthStart),
      exceptions: {},
    },
    {
      id: 'rule-internet',
      kind: 'subscription',
      label: 'Internet — Vidéotron',
      amount: -74.99,
      categoryId: 'cat-utilities',
      rrule: 'FREQ=MONTHLY;BYMONTHDAY=22',
      startDate: iso(monthStart),
      exceptions: {},
      subscription: { vendor: 'Vidéotron', lastReviewedAt: todayISO() },
    },
    {
      id: 'rule-netflix',
      kind: 'subscription',
      label: 'Netflix',
      amount: -19.99,
      categoryId: 'cat-subscription',
      rrule: 'FREQ=MONTHLY;BYMONTHDAY=8',
      startDate: iso(monthStart),
      exceptions: {},
      subscription: { vendor: 'Netflix' },
    },
    {
      id: 'rule-spotify',
      kind: 'subscription',
      label: 'Spotify Famille',
      amount: -16.99,
      categoryId: 'cat-subscription',
      rrule: 'FREQ=MONTHLY;BYMONTHDAY=12',
      startDate: iso(monthStart),
      exceptions: {},
      subscription: { vendor: 'Spotify' },
    },
    {
      id: 'rule-icloud',
      kind: 'subscription',
      label: 'iCloud+ 200 Go',
      amount: -3.99,
      categoryId: 'cat-subscription',
      rrule: 'FREQ=MONTHLY;BYMONTHDAY=3',
      startDate: iso(monthStart),
      exceptions: {},
      subscription: { vendor: 'Apple' },
    },
    {
      id: 'rule-gym',
      kind: 'subscription',
      label: 'Gym Énergie',
      amount: -49,
      categoryId: 'cat-leisure',
      rrule: 'FREQ=MONTHLY;BYMONTHDAY=5',
      startDate: iso(monthStart),
      exceptions: {},
      subscription: { vendor: 'Énergie Cardio' },
    },
    {
      id: 'rule-savings',
      kind: 'expense',
      label: 'Virement épargne',
      amount: -250,
      categoryId: 'cat-savings',
      rrule: 'FREQ=MONTHLY;BYMONTHDAY=2',
      startDate: iso(monthStart),
      exceptions: {},
    },
    {
      id: 'rule-groceries',
      kind: 'expense',
      label: 'Épicerie hebdo',
      amount: -135,
      categoryId: 'cat-groceries',
      rrule: 'FREQ=WEEKLY;BYDAY=SA',
      startDate: iso(addDays(monthStart, ((6 - monthStart.getDay() + 7) % 7))),
      exceptions: {},
    },
  ];

  const recurringRules: Record<string, RecurringRule> = Object.fromEntries(
    rules.map((r) => [r.id, r]),
  );

  // A few one-off planned items in the next 60 days to show variation.
  const txs: Transaction[] = [
    {
      id: 'tx-dentist',
      date: iso(addDays(now, 11)),
      amount: -185,
      label: 'Dentiste',
      categoryId: 'cat-leisure',
      status: 'planned',
    },
    {
      id: 'tx-gift',
      date: iso(addDays(now, 24)),
      amount: -120,
      label: 'Cadeau anniversaire',
      categoryId: 'cat-leisure',
      status: 'planned',
    },
    {
      id: 'tx-bonus',
      date: iso(addDays(now, 38)),
      amount: 600,
      label: 'Remboursement impôt',
      categoryId: 'cat-salary',
      status: 'planned',
    },
  ];

  return {
    schemaVersion: 1,
    profile: {
      currency: 'CAD',
      locale: 'fr-CA',
      openingBalance: 1820,
      openingDate: iso(now),
      createdAt: iso(now),
    },
    transactions: Object.fromEntries(txs.map((t) => [t.id, t])),
    recurringRules,
    scenarios: {},
    categories,
    preferences: {
      theme: 'dark',
      accent: 'neon-violet',
      stressThresholds: { critical: 100, warning: 500, comfortable: 2000 },
      timeline: { defaultHorizonDays: 90, maxHorizonDays: 730 },
      privacy: { blurAmounts: false },
    },
  };
}
