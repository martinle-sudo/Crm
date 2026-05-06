export interface SubscriptionPreset {
  label: string;
  vendor: string;
  amount: number;
  hue: string;
}

export const SUBSCRIPTION_PRESETS: SubscriptionPreset[] = [
  { label: 'Netflix', vendor: 'Netflix', amount: 19.99, hue: '#ef4444' },
  { label: 'Spotify', vendor: 'Spotify', amount: 16.99, hue: '#22c55e' },
  { label: 'Disney+', vendor: 'Disney', amount: 14.99, hue: '#0ea5e9' },
  { label: 'Apple One', vendor: 'Apple', amount: 22.95, hue: '#a3a3a3' },
  { label: 'iCloud+', vendor: 'Apple', amount: 3.99, hue: '#a3a3a3' },
  { label: 'YouTube Premium', vendor: 'Google', amount: 13.99, hue: '#ef4444' },
  { label: 'ChatGPT Plus', vendor: 'OpenAI', amount: 27, hue: '#10a37f' },
  { label: 'Claude Pro', vendor: 'Anthropic', amount: 27, hue: '#cc785c' },
  { label: 'Crave', vendor: 'Bell', amount: 19.99, hue: '#3b82f6' },
  { label: 'Amazon Prime', vendor: 'Amazon', amount: 9.99, hue: '#0ea5e9' },
  { label: 'Adobe Creative Cloud', vendor: 'Adobe', amount: 67.99, hue: '#dc2626' },
  { label: 'Notion', vendor: 'Notion', amount: 14, hue: '#a3a3a3' },
  { label: 'Gym', vendor: 'Gym', amount: 49, hue: '#fbbf24' },
];

export type ExpenseFrequency = 'monthly' | 'weekly';

export interface FixedExpensePreset {
  label: string;
  hint: string;
  defaultAmount: number;
  frequency: ExpenseFrequency;
  /** Used when frequency = 'monthly' (1-28). */
  defaultDayOfMonth?: number;
  /** Used when frequency = 'weekly' (0=Sun, 1=Mon, ..., 6=Sat). */
  defaultWeekday?: number;
  categoryId: string;
}

export const FIXED_EXPENSE_PRESETS: FixedExpensePreset[] = [
  // Monthly
  { label: 'Loyer / Hypothèque', hint: 'Logement', defaultAmount: 1500, frequency: 'monthly', defaultDayOfMonth: 1, categoryId: 'cat-rent' },
  { label: 'Hydro', hint: 'Électricité', defaultAmount: 80, frequency: 'monthly', defaultDayOfMonth: 15, categoryId: 'cat-utilities' },
  { label: 'Internet', hint: 'Forfait maison', defaultAmount: 75, frequency: 'monthly', defaultDayOfMonth: 20, categoryId: 'cat-utilities' },
  { label: 'Cellulaire', hint: 'Forfait mobile', defaultAmount: 55, frequency: 'monthly', defaultDayOfMonth: 10, categoryId: 'cat-utilities' },
  { label: 'Assurance auto', hint: 'Auto', defaultAmount: 130, frequency: 'monthly', defaultDayOfMonth: 5, categoryId: 'cat-other' },
  { label: 'Assurance habitation', hint: 'Logement', defaultAmount: 45, frequency: 'monthly', defaultDayOfMonth: 5, categoryId: 'cat-rent' },
  { label: 'Épargne automatique', hint: 'Virement', defaultAmount: 250, frequency: 'monthly', defaultDayOfMonth: 2, categoryId: 'cat-other' },
  // Weekly
  { label: 'Épicerie', hint: 'Hebdo', defaultAmount: 135, frequency: 'weekly', defaultWeekday: 6, categoryId: 'cat-other' },
  { label: 'Essence', hint: 'Hebdo', defaultAmount: 60, frequency: 'weekly', defaultWeekday: 5, categoryId: 'cat-other' },
  { label: 'Garderie', hint: 'Hebdo', defaultAmount: 200, frequency: 'weekly', defaultWeekday: 1, categoryId: 'cat-other' },
];
