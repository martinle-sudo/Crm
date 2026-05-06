// Domain types — single account, single currency. All money values are signed
// numbers in the user's currency (positive = inflow, negative = outflow).

export type ISODate = string; // 'YYYY-MM-DD'
export type TxId = string;
export type RuleId = string;
export type ScenarioId = string;
export type CategoryId = string;

export type Currency = 'CAD' | 'USD' | 'EUR' | 'GBP' | 'CHF';

export interface UserProfile {
  currency: Currency;
  locale: string;
  openingBalance: number;
  openingDate: ISODate;
  createdAt: ISODate;
}

export type TxStatus = 'cleared' | 'pending' | 'planned';

export interface Transaction {
  id: TxId;
  date: ISODate;
  amount: number;
  label: string;
  categoryId?: CategoryId;
  status: TxStatus;
  sourceRuleId?: RuleId;
  notes?: string;
}

export type RuleKind = 'income' | 'expense' | 'subscription';

export type RuleException =
  | { type: 'skip' }
  | { type: 'shift'; newDate: ISODate; newAmount?: number };

export interface RecurringRule {
  id: RuleId;
  kind: RuleKind;
  label: string;
  amount: number; // signed
  categoryId?: CategoryId;
  rrule: string; // iCal RRULE body, e.g. "FREQ=MONTHLY;BYMONTHDAY=1"
  startDate: ISODate;
  endDate?: ISODate;
  exceptions: Record<ISODate, RuleException>;
  subscription?: {
    vendor: string;
    cancelUrl?: string;
    lastReviewedAt?: ISODate;
    trialEndsAt?: ISODate;
  };
}

export interface Scenario {
  id: ScenarioId;
  name: string;
  color: string;
  active: boolean;
  createdAt: ISODate;
  additions: Transaction[];
  recurringAdditions: RecurringRule[];
}

export interface Category {
  id: CategoryId;
  name: string;
  icon: string;
  color: string;
  type: 'fixed' | 'variable' | 'income';
}

export interface Preferences {
  theme: 'dark' | 'light' | 'auto';
  accent: 'neon-violet' | 'neon-cyan' | 'pastel-mint' | 'pastel-coral';
  stressThresholds: {
    critical: number;
    warning: number;
    comfortable: number;
  };
  timeline: {
    defaultHorizonDays: number;
    maxHorizonDays: number;
  };
  privacy: {
    blurAmounts: boolean;
  };
}

export interface AppState {
  schemaVersion: 1;
  profile: UserProfile;
  transactions: Record<TxId, Transaction>;
  recurringRules: Record<RuleId, RecurringRule>;
  scenarios: Record<ScenarioId, Scenario>;
  categories: Record<CategoryId, Category>;
  preferences: Preferences;
}

export type StressLevel = 'critical' | 'warning' | 'okay' | 'comfortable';

export interface DayProjection {
  date: ISODate;
  openingBalance: number;
  inflow: number;
  outflow: number;
  closingBalance: number;
  events: ProjectedEvent[];
  stress: StressLevel;
}

export interface ProjectedEvent {
  date: ISODate;
  label: string;
  amount: number;
  source: 'transaction' | 'rule' | 'scenario';
  ruleId?: RuleId;
  txId?: TxId;
  scenarioId?: ScenarioId;
  kind?: RuleKind;
  categoryId?: CategoryId;
  shifted?: boolean; // true if moved by exception
}
