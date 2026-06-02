// Calcul des taxes du Québec (TPS + TVQ) et totaux de lignes.
import type { LineItem } from './types';

// Taux par défaut au Québec : TPS 5 %, TVQ 9,975 %.
export const DEFAULT_GST = 0.05;
export const DEFAULT_QST = 0.09975;

export interface TaxBreakdown {
  subtotal: number;
  gst: number;
  qst: number;
  total: number;
}

export const lineTotal = (line: LineItem): number => line.qty * line.unitPrice;

export const computeTaxes = (
  lines: LineItem[],
  gstRate: number,
  qstRate: number,
): TaxBreakdown => {
  const subtotal = lines.reduce((sum, l) => sum + lineTotal(l), 0);
  const gst = round2(subtotal * gstRate);
  const qst = round2(subtotal * qstRate);
  return {
    subtotal: round2(subtotal),
    gst,
    qst,
    total: round2(subtotal + gst + qst),
  };
};

export const round2 = (n: number): number => Math.round(n * 100) / 100;
