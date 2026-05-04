import type { Currency, ISODate } from './types';
import { fromISO } from './dates';

const formatterCache = new Map<string, Intl.NumberFormat>();

export const moneyFormatter = (
  locale: string,
  currency: Currency,
  opts: { compact?: boolean; signDisplay?: 'auto' | 'always' | 'never' } = {},
): Intl.NumberFormat => {
  const key = `${locale}|${currency}|${opts.compact ?? false}|${opts.signDisplay ?? 'auto'}`;
  const cached = formatterCache.get(key);
  if (cached) return cached;
  const fmt = new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    notation: opts.compact ? 'compact' : 'standard',
    maximumFractionDigits: opts.compact ? 1 : 2,
    minimumFractionDigits: opts.compact ? 0 : 2,
    signDisplay: opts.signDisplay,
  });
  formatterCache.set(key, fmt);
  return fmt;
};

export const formatMoney = (
  amount: number,
  locale: string,
  currency: Currency,
  opts?: { compact?: boolean; signDisplay?: 'auto' | 'always' | 'never' },
) => moneyFormatter(locale, currency, opts).format(amount);

const dateFormatterCache = new Map<string, Intl.DateTimeFormat>();

export const formatDate = (
  iso: ISODate,
  locale: string,
  options: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short' },
): string => {
  const key = `${locale}|${JSON.stringify(options)}`;
  let fmt = dateFormatterCache.get(key);
  if (!fmt) {
    fmt = new Intl.DateTimeFormat(locale, options);
    dateFormatterCache.set(key, fmt);
  }
  return fmt.format(fromISO(iso));
};
