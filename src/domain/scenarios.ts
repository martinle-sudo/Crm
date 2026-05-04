import { nanoid } from 'nanoid';
import type { Scenario, Transaction, RecurringRule } from './types';
import { todayISO } from './dates';

const SCENARIO_PALETTE = [
  '#a78bfa',
  '#67e8f9',
  '#6ee7b7',
  '#fda4af',
  '#fcd34d',
  '#f0abfc',
];

export function createScenario(name: string, color?: string): Scenario {
  return {
    id: nanoid(10),
    name,
    color: color ?? SCENARIO_PALETTE[Math.floor(Math.random() * SCENARIO_PALETTE.length)],
    active: true,
    createdAt: todayISO(),
    additions: [],
    recurringAdditions: [],
  };
}

export function addOneOff(
  scenario: Scenario,
  tx: Omit<Transaction, 'id' | 'status'>,
): Scenario {
  const transaction: Transaction = {
    ...tx,
    id: nanoid(10),
    status: 'planned',
  };
  return { ...scenario, additions: [...scenario.additions, transaction] };
}

export function addRecurring(
  scenario: Scenario,
  rule: Omit<RecurringRule, 'id' | 'exceptions'>,
): Scenario {
  const recurring: RecurringRule = {
    ...rule,
    id: nanoid(10),
    exceptions: {},
  };
  return {
    ...scenario,
    recurringAdditions: [...scenario.recurringAdditions, recurring],
  };
}
