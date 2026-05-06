import { RRule, rrulestr } from 'rrule';
import type { ISODate, RecurringRule, ProjectedEvent } from './types';
import { fromISO, toISO } from './dates';

// Cache of parsed RRULEs keyed by `${rrule}@${dtstart}` so we don't re-parse on
// every projection call.
const ruleCache = new Map<string, RRule>();

const parseRule = (rrule: string, startDate: ISODate): RRule => {
  const key = `${rrule}@${startDate}`;
  const cached = ruleCache.get(key);
  if (cached) return cached;
  // Many user-friendly RRULE strings omit DTSTART; we anchor it explicitly.
  const dt = fromISO(startDate);
  const dtUTC = new Date(Date.UTC(dt.getFullYear(), dt.getMonth(), dt.getDate()));
  const body = rrule.startsWith('RRULE:') ? rrule : `RRULE:${rrule}`;
  const rule = rrulestr(body, { dtstart: dtUTC }) as RRule;
  ruleCache.set(key, rule);
  return rule;
};

// Convert a UTC RRule occurrence back into a local ISODate without TZ shifts.
const occurrenceToISO = (occ: Date): ISODate => {
  const y = occ.getUTCFullYear();
  const m = String(occ.getUTCMonth() + 1).padStart(2, '0');
  const d = String(occ.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

/**
 * Expand a single recurring rule into projected events between [from, to],
 * applying exceptions (skip / shift). The original date may fall outside the
 * window but its shifted counterpart inside it — we cover that case.
 */
export function expandRule(
  rule: RecurringRule,
  from: ISODate,
  to: ISODate,
): ProjectedEvent[] {
  const ruleEnd = rule.endDate ?? '9999-12-31';
  const effectiveTo = to < ruleEnd ? to : ruleEnd;
  if (effectiveTo < rule.startDate) return [];
  if (from > ruleEnd) return [];

  // Widen the lookup window backwards a bit so a shifted occurrence whose
  // original date is just before `from` still gets considered.
  const lookbackDays = 62;
  const lookFromDate = fromISO(from);
  lookFromDate.setUTCDate(lookFromDate.getUTCDate() - lookbackDays);
  const lookFrom = toISO(lookFromDate);
  const queryFrom = lookFrom < rule.startDate ? rule.startDate : lookFrom;

  const parsed = parseRule(rule.rrule, rule.startDate);
  const start = fromISO(queryFrom);
  const end = fromISO(effectiveTo);
  const startUTC = new Date(
    Date.UTC(start.getFullYear(), start.getMonth(), start.getDate()),
  );
  const endUTC = new Date(
    Date.UTC(end.getFullYear(), end.getMonth(), end.getDate()),
  );

  const occurrences = parsed.between(startUTC, endUTC, true);

  const events: ProjectedEvent[] = [];
  for (const occ of occurrences) {
    const originalISO = occurrenceToISO(occ);
    const exception = rule.exceptions[originalISO];
    if (exception?.type === 'skip') continue;

    const effectiveDate =
      exception?.type === 'shift' ? exception.newDate : originalISO;
    const effectiveAmount =
      exception?.type === 'shift' && exception.newAmount !== undefined
        ? exception.newAmount
        : rule.amount;

    if (effectiveDate < from || effectiveDate > to) continue;

    events.push({
      date: effectiveDate,
      label: rule.label,
      amount: effectiveAmount,
      source: 'rule',
      ruleId: rule.id,
      kind: rule.kind,
      categoryId: rule.categoryId,
      shifted: exception?.type === 'shift',
    });
  }
  return events;
}

/** Get the next N occurrences of a rule from a given anchor (inclusive). */
export function nextOccurrences(
  rule: RecurringRule,
  from: ISODate,
  count: number,
): ISODate[] {
  const parsed = parseRule(rule.rrule, rule.startDate);
  const anchor = fromISO(from);
  const anchorUTC = new Date(
    Date.UTC(anchor.getFullYear(), anchor.getMonth(), anchor.getDate()),
  );
  const occs: Date[] = [];
  let cursor: Date | null = parsed.after(anchorUTC, true);
  while (cursor && occs.length < count) {
    occs.push(cursor);
    cursor = parsed.after(cursor, false);
  }
  return occs.map(occurrenceToISO);
}

/** Human-readable label for common RRULEs. */
export function describeRule(rrule: string): string {
  try {
    const r = rrulestr(rrule.startsWith('RRULE:') ? rrule : `RRULE:${rrule}`);
    return r.toText();
  } catch {
    return rrule;
  }
}
