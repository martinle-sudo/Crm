// Sélecteurs/dérivations partagés sur l'état du CRM.
import type { AppState, Invoice } from '@/domain/types';
import { computeTaxes } from '@/domain/quebec';
import { todayISO } from '@/domain/dates';

export const clientName = (s: AppState, id?: string): string =>
  (id && s.clients[id]?.name) || '—';

export const employeeName = (s: AppState, id?: string): string => {
  const e = id ? s.employees[id] : undefined;
  return e ? `${e.firstName} ${e.lastName}` : '—';
};

export const invoiceTotal = (inv: Invoice): number =>
  computeTaxes(inv.lines, inv.gstRate, inv.qstRate).total;

/** Une facture est-elle réellement en retard (échue + non payée) ? */
export const isOverdue = (inv: Invoice): boolean =>
  inv.status !== 'paid' && inv.status !== 'cancelled' && inv.dueDate < todayISO();

export const monthKey = (iso: string): string => iso.slice(0, 7); // YYYY-MM

export const sortByDateDesc = <T extends { date?: string; issueDate?: string }>(a: T, b: T) => {
  const ax = a.date ?? a.issueDate ?? '';
  const bx = b.date ?? b.issueDate ?? '';
  return ax < bx ? 1 : ax > bx ? -1 : 0;
};
