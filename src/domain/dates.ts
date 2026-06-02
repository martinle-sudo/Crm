import {
  format,
  parseISO,
  addDays,
  addWeeks,
  addMonths,
  startOfWeek,
  startOfMonth,
  endOfMonth,
  isSameDay,
  differenceInCalendarDays,
} from 'date-fns';
import { fr } from 'date-fns/locale';
import type { ISODate } from './types';

export const toISO = (d: Date): ISODate => format(d, 'yyyy-MM-dd');
export const fromISO = (s: ISODate): Date => parseISO(s);

export const todayISO = (): ISODate => toISO(new Date());

export const clampISO = (s: ISODate, min: ISODate, max: ISODate): ISODate => {
  if (s < min) return min;
  if (s > max) return max;
  return s;
};

export const addDaysISO = (s: ISODate, n: number): ISODate =>
  toISO(addDays(fromISO(s), n));
export const addWeeksISO = (s: ISODate, n: number): ISODate =>
  toISO(addWeeks(fromISO(s), n));
export const addMonthsISO = (s: ISODate, n: number): ISODate =>
  toISO(addMonths(fromISO(s), n));

export const weekdayOf = (s: ISODate): number => fromISO(s).getDay();

/** Libellé court relatif/absolu en français. */
export const prettyDate = (
  s: ISODate,
  opts: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short' },
): string => fromISO(s).toLocaleDateString('fr-CA', opts);

export const longDate = (s: ISODate): string =>
  format(fromISO(s), 'EEEE d MMMM yyyy', { locale: fr });

export const daysUntil = (s: ISODate): number =>
  differenceInCalendarDays(fromISO(s), new Date());

export {
  addDays,
  addWeeks,
  addMonths,
  startOfWeek,
  startOfMonth,
  endOfMonth,
  isSameDay,
  format,
  fr,
};
