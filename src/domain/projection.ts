import type {
  AppState,
  ISODate,
  DayProjection,
  ProjectedEvent,
  Scenario,
  StressLevel,
  Preferences,
} from './types';
import { expandRule } from './recurrence';
import { fromISO, toISO } from './dates';

interface ProjectionInput {
  state: AppState;
  /** Active scenarios to overlay on top of the real ledger. */
  scenarios?: Scenario[];
}

interface ProjectOptions {
  /** Inclusive lower bound (defaults to opening date). */
  from?: ISODate;
  /** Inclusive upper bound. */
  to: ISODate;
}

/**
 * Compute the projected daily series between [from, to] inclusive. The
 * algorithm is deterministic and pure:
 *
 *   1. Collect every event in window: planned/pending tx + expanded rules
 *      + scenario additions + scenario rule additions.
 *   2. Bucket events by ISO date.
 *   3. Walk days sequentially, accumulating the running balance.
 *
 * Complexity: O(R · O_R + T_window + D) where R = rule count, O_R = occurrences
 * per rule in window, T_window = transactions in window, D = days in window.
 */
export function projectSeries(
  input: ProjectionInput,
  opts: ProjectOptions,
): DayProjection[] {
  const { state, scenarios = [] } = input;
  const from = opts.from ?? state.profile.openingDate;
  const to = opts.to;
  if (to < from) return [];

  // 1. Gather events.
  const events: ProjectedEvent[] = [];

  // Real one-off transactions in the window. Only `pending` and `planned`
  // count toward future projection; `cleared` are already baked into the
  // running balance from openingDate forward (they're historical truth).
  for (const tx of Object.values(state.transactions)) {
    if (tx.date < from || tx.date > to) continue;
    events.push({
      date: tx.date,
      label: tx.label,
      amount: tx.amount,
      source: 'transaction',
      txId: tx.id,
      categoryId: tx.categoryId,
    });
  }

  // Real recurring rules.
  for (const rule of Object.values(state.recurringRules)) {
    events.push(...expandRule(rule, from, to));
  }

  // Scenario overlays.
  for (const scenario of scenarios) {
    if (!scenario.active) continue;
    for (const tx of scenario.additions) {
      if (tx.date < from || tx.date > to) continue;
      events.push({
        date: tx.date,
        label: tx.label,
        amount: tx.amount,
        source: 'scenario',
        scenarioId: scenario.id,
        txId: tx.id,
        categoryId: tx.categoryId,
      });
    }
    for (const rule of scenario.recurringAdditions) {
      const expanded = expandRule(rule, from, to);
      for (const e of expanded) {
        events.push({ ...e, source: 'scenario', scenarioId: scenario.id });
      }
    }
  }

  // 2. Bucket by date.
  const byDate = new Map<ISODate, ProjectedEvent[]>();
  for (const e of events) {
    const list = byDate.get(e.date);
    if (list) list.push(e);
    else byDate.set(e.date, [e]);
  }

  // 3. Walk days.
  const out: DayProjection[] = [];
  let running = state.profile.openingBalance;
  // If `from` is after the opening date, we need to fold every event between
  // openingDate and from-1 into the running balance.
  if (from > state.profile.openingDate) {
    const prefixEvents: ProjectedEvent[] = [];
    for (const tx of Object.values(state.transactions)) {
      if (tx.date < state.profile.openingDate || tx.date >= from) continue;
      prefixEvents.push({
        date: tx.date,
        label: tx.label,
        amount: tx.amount,
        source: 'transaction',
        txId: tx.id,
      });
    }
    const prefixTo = previousISO(from);
    for (const rule of Object.values(state.recurringRules)) {
      prefixEvents.push(
        ...expandRule(rule, state.profile.openingDate, prefixTo),
      );
    }
    for (const scenario of scenarios) {
      if (!scenario.active) continue;
      for (const tx of scenario.additions) {
        if (tx.date < state.profile.openingDate || tx.date >= from) continue;
        prefixEvents.push({
          date: tx.date,
          label: tx.label,
          amount: tx.amount,
          source: 'scenario',
          scenarioId: scenario.id,
          txId: tx.id,
        });
      }
      for (const rule of scenario.recurringAdditions) {
        prefixEvents.push(
          ...expandRule(rule, state.profile.openingDate, prefixTo),
        );
      }
    }
    for (const e of prefixEvents) running += e.amount;
  }

  const cursor = fromISO(from);
  const endDate = fromISO(to);
  while (cursor <= endDate) {
    const iso = toISO(cursor);
    const dayEvents = byDate.get(iso) ?? [];
    let inflow = 0;
    let outflow = 0;
    for (const e of dayEvents) {
      if (e.amount >= 0) inflow += e.amount;
      else outflow += -e.amount;
    }
    const opening = running;
    const closing = running + inflow - outflow;
    out.push({
      date: iso,
      openingBalance: round(opening),
      inflow: round(inflow),
      outflow: round(outflow),
      closingBalance: round(closing),
      events: dayEvents,
      stress: scoreStress(closing, state.preferences),
    });
    running = closing;
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return out;
}

/**
 * Project the balance at exactly one date (J+X). Convenience wrapper that
 * walks the series and returns the final closing balance. Used by the
 * interactive timeline cursor.
 */
export function projectAt(input: ProjectionInput, date: ISODate): number {
  const series = projectSeries(input, { to: date });
  if (series.length === 0) return input.state.profile.openingBalance;
  return series[series.length - 1].closingBalance;
}

export function scoreStress(
  balance: number,
  prefs: Preferences,
): StressLevel {
  const t = prefs.stressThresholds;
  if (balance < t.critical) return 'critical';
  if (balance < t.warning) return 'warning';
  if (balance < t.comfortable) return 'okay';
  return 'comfortable';
}

const round = (n: number): number => Math.round(n * 100) / 100;

const previousISO = (s: ISODate): ISODate => {
  const d = fromISO(s);
  d.setUTCDate(d.getUTCDate() - 1);
  return toISO(d);
};
