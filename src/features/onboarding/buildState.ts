import { nanoid } from 'nanoid';
import { format, getDay } from 'date-fns';
import type {
  AppState,
  Currency,
  ISODate,
  RecurringRule,
  Category,
} from '@/domain/types';

export type IncomeFrequency = 'weekly' | 'biweekly' | 'semi-monthly' | 'monthly';

export interface OnboardingForm {
  currency: Currency;
  locale: string;
  openingBalance: number;
  income: {
    label: string;
    amount: number;
    frequency: IncomeFrequency;
    firstDate: ISODate;
  };
  fixedExpenses: Array<{
    id: string;
    label: string;
    amount: number;
    dayOfMonth: number;
    categoryId?: string;
  }>;
  subscriptions: Array<{
    id: string;
    label: string;
    vendor?: string;
    amount: number;
    dayOfMonth: number;
  }>;
  thresholds: { critical: number; warning: number; comfortable: number };
}

const WEEKDAY_LETTERS = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'] as const;

function buildIncomeRRule(
  freq: IncomeFrequency,
  firstDate: Date,
): string {
  const dow = WEEKDAY_LETTERS[getDay(firstDate)];
  const dom = firstDate.getDate();
  switch (freq) {
    case 'weekly':
      return `FREQ=WEEKLY;BYDAY=${dow}`;
    case 'biweekly':
      return `FREQ=WEEKLY;INTERVAL=2;BYDAY=${dow}`;
    case 'semi-monthly':
      return 'FREQ=MONTHLY;BYMONTHDAY=1,15';
    case 'monthly':
      return `FREQ=MONTHLY;BYMONTHDAY=${dom}`;
  }
}

const baseCategories = (): Record<string, Category> => ({
  'cat-salary': {
    id: 'cat-salary',
    name: 'Revenus',
    icon: 'briefcase',
    color: '#6ee7b7',
    type: 'income',
  },
  'cat-rent': {
    id: 'cat-rent',
    name: 'Logement',
    icon: 'home',
    color: '#fda4af',
    type: 'fixed',
  },
  'cat-utilities': {
    id: 'cat-utilities',
    name: 'Services',
    icon: 'plug',
    color: '#67e8f9',
    type: 'fixed',
  },
  'cat-subscription': {
    id: 'cat-subscription',
    name: 'Abonnements',
    icon: 'repeat',
    color: '#a78bfa',
    type: 'fixed',
  },
  'cat-other': {
    id: 'cat-other',
    name: 'Autre',
    icon: 'circle',
    color: '#fcd34d',
    type: 'variable',
  },
});

export function buildStateFromOnboarding(form: OnboardingForm): AppState {
  const today = format(new Date(), 'yyyy-MM-dd');
  const incomeFirst = new Date(form.income.firstDate);

  const rules: RecurringRule[] = [];

  if (form.income.amount > 0 && form.income.label) {
    rules.push({
      id: nanoid(10),
      kind: 'income',
      label: form.income.label,
      amount: Math.abs(form.income.amount),
      categoryId: 'cat-salary',
      rrule: buildIncomeRRule(form.income.frequency, incomeFirst),
      startDate: form.income.firstDate,
      exceptions: {},
    });
  }

  for (const exp of form.fixedExpenses) {
    if (!exp.label || exp.amount <= 0) continue;
    rules.push({
      id: nanoid(10),
      kind: 'expense',
      label: exp.label,
      amount: -Math.abs(exp.amount),
      categoryId: exp.categoryId ?? 'cat-rent',
      rrule: `FREQ=MONTHLY;BYMONTHDAY=${clampDom(exp.dayOfMonth)}`,
      startDate: today,
      exceptions: {},
    });
  }

  for (const sub of form.subscriptions) {
    if (!sub.label || sub.amount <= 0) continue;
    rules.push({
      id: nanoid(10),
      kind: 'subscription',
      label: sub.label,
      amount: -Math.abs(sub.amount),
      categoryId: 'cat-subscription',
      rrule: `FREQ=MONTHLY;BYMONTHDAY=${clampDom(sub.dayOfMonth)}`,
      startDate: today,
      exceptions: {},
      subscription: { vendor: sub.vendor ?? sub.label },
    });
  }

  return {
    schemaVersion: 1,
    profile: {
      currency: form.currency,
      locale: form.locale,
      openingBalance: form.openingBalance,
      openingDate: today,
      createdAt: today,
    },
    transactions: {},
    recurringRules: Object.fromEntries(rules.map((r) => [r.id, r])),
    scenarios: {},
    categories: baseCategories(),
    preferences: {
      theme: 'dark',
      accent: 'neon-violet',
      stressThresholds: form.thresholds,
      timeline: { defaultHorizonDays: 90, maxHorizonDays: 730 },
      privacy: { blurAmounts: false },
    },
  };
}

const clampDom = (d: number) => Math.max(1, Math.min(28, Math.round(d)));

/**
 * Suggest stress thresholds from declared monthly outflow.
 * critical    ≈ 5% of monthly outflow (a really thin cushion)
 * warning     ≈ 25% (one week of expenses)
 * comfortable ≈ 100% (one full month buffer)
 */
export function suggestThresholds(
  monthlyOutflow: number,
): { critical: number; warning: number; comfortable: number } {
  const m = Math.max(monthlyOutflow, 0);
  return {
    critical: Math.round(m * 0.05),
    warning: Math.round(m * 0.25),
    comfortable: Math.round(m),
  };
}

/**
 * Approximate monthly outflow given the form (income aside).
 * Subscriptions are assumed monthly; fixed expenses already monthly.
 * Income frequency is converted to monthly for inflow.
 */
export function monthlyTotals(
  form: OnboardingForm,
): { inflow: number; outflow: number } {
  let outflow = 0;
  for (const e of form.fixedExpenses) outflow += Math.abs(e.amount);
  for (const s of form.subscriptions) outflow += Math.abs(s.amount);

  const inc = Math.abs(form.income.amount);
  const inflow =
    form.income.frequency === 'weekly'
      ? inc * 4.345
      : form.income.frequency === 'biweekly'
        ? inc * 2.174
        : form.income.frequency === 'semi-monthly'
          ? inc * 2
          : inc;

  return { inflow: Math.round(inflow), outflow: Math.round(outflow) };
}
