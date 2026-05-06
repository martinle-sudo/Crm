import { format, parseISO } from 'date-fns';
import type { ISODate } from './types';

export const toISO = (d: Date): ISODate => format(d, 'yyyy-MM-dd');
export const fromISO = (s: ISODate): Date => parseISO(s);

export const todayISO = (): ISODate => toISO(new Date());

export const clampISO = (s: ISODate, min: ISODate, max: ISODate): ISODate => {
  if (s < min) return min;
  if (s > max) return max;
  return s;
};
