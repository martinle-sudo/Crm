// Génération des occurrences d'intervention à partir d'un contrat récurrent.
import type { Contract, Service, ServiceId } from './types';
import { addDaysISO, addWeeksISO, addMonthsISO, weekdayOf } from './dates';

/** Montant facturable d'une visite : override sinon somme des services. */
export const contractVisitAmount = (
  contract: Contract,
  services: Record<ServiceId, Service>,
): number => {
  if (typeof contract.amountOverride === 'number') return contract.amountOverride;
  return contract.serviceIds.reduce((sum, id) => {
    const svc = services[id];
    if (!svc) return sum;
    return sum + (svc.pricingMode === 'flat'
      ? svc.unitPrice
      : svc.unitPrice * (svc.durationMin / 60));
  }, 0);
};

/** Durée totale estimée d'une visite, en minutes. */
export const contractVisitDuration = (
  contract: Contract,
  services: Record<ServiceId, Service>,
): number =>
  contract.serviceIds.reduce((sum, id) => sum + (services[id]?.durationMin ?? 0), 0);

/** Aligne une date de départ sur le bon jour de semaine du contrat. */
const alignToWeekday = (startDate: string, weekday: number): string => {
  let d = startDate;
  for (let i = 0; i < 7; i++) {
    if (weekdayOf(d) === weekday) return d;
    d = addDaysISO(d, 1);
  }
  return startDate;
};

/**
 * Liste les dates d'occurrence d'un contrat entre `from` et `to` (inclus).
 * Respecte la fréquence et l'éventuelle date de fin du contrat.
 */
export const occurrenceDates = (
  contract: Contract,
  from: string,
  to: string,
): string[] => {
  const dates: string[] = [];
  const hardEnd = contract.endDate && contract.endDate < to ? contract.endDate : to;

  if (contract.frequency === 'oneoff') {
    if (contract.startDate >= from && contract.startDate <= hardEnd) {
      dates.push(contract.startDate);
    }
    return dates;
  }

  let cursor = alignToWeekday(contract.startDate, contract.weekday);
  let guard = 0;
  while (cursor <= hardEnd && guard < 2000) {
    guard++;
    if (cursor >= from) dates.push(cursor);
    if (contract.frequency === 'weekly') cursor = addWeeksISO(cursor, 1);
    else if (contract.frequency === 'biweekly') cursor = addWeeksISO(cursor, 2);
    else if (contract.frequency === 'monthly') cursor = addMonthsISO(cursor, 1);
    else break;
  }
  return dates;
};
