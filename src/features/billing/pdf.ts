import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { Invoice, Quote, Company } from '@/domain/types';
import { computeTaxes } from '@/domain/quebec';
import { prettyDate } from '@/domain/dates';

const CAD = (n: number) =>
  new Intl.NumberFormat('fr-CA', { style: 'currency', currency: 'CAD' }).format(n);

const DARK  = [20, 20, 30] as [number, number, number];
const LIGHT = [245, 245, 250] as [number, number, number];
const MID   = [100, 100, 120] as [number, number, number];
const ACCENT: [number, number, number] = [105, 75, 230]; // violet

function buildDoc(
  docNumber: string,
  docType: 'FACTURE' | 'SOUMISSION',
  issueLabel: string,
  endLabel: string,
  recipientName: string,
  recipientAddress: string | undefined,
  recipientEmail: string | undefined,
  lines: Invoice['lines'],
  gstRate: number,
  qstRate: number,
  company: Company,
  notes: string | undefined,
  gstNumber: string | undefined,
  qstNumber: string | undefined,
): jsPDF {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'letter' });
  const pw = doc.internal.pageSize.getWidth();

  // ── Header band ──────────────────────────────────────────────────────
  doc.setFillColor(...DARK);
  doc.rect(0, 0, pw, 38, 'F');

  // Accent stripe
  doc.setFillColor(...ACCENT);
  doc.rect(0, 0, 4, 38, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text(company.name, 12, 14);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(180, 180, 200);
  const companyLines: string[] = [];
  if (company.address) companyLines.push(company.address);
  const cityLine = [company.city, company.postalCode].filter(Boolean).join(', ');
  if (cityLine) companyLines.push(cityLine);
  if (company.phone) companyLines.push(company.phone);
  if (company.email) companyLines.push(company.email);
  doc.text(companyLines, 12, 20);

  // Document type + number (right side)
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.text(docType, pw - 14, 14, { align: 'right' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(200, 200, 220);
  doc.text(docNumber, pw - 14, 22, { align: 'right' });

  // ── Meta block (dates) ────────────────────────────────────────────────
  let y = 46;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(...MID);
  doc.text(issueLabel, pw - 14, y, { align: 'right' });
  y += 5;
  doc.text(endLabel, pw - 14, y, { align: 'right' });

  if (gstNumber || qstNumber) {
    y += 5;
    doc.setFontSize(7.5);
    if (gstNumber) {
      doc.text(`TPS : ${gstNumber}`, pw - 14, y, { align: 'right' });
      y += 4;
    }
    if (qstNumber) {
      doc.text(`TVQ : ${qstNumber}`, pw - 14, y, { align: 'right' });
    }
  }

  // ── Bill-to block ─────────────────────────────────────────────────────
  const billY = 46;
  doc.setFillColor(...LIGHT);
  doc.roundedRect(14, billY - 4, 80, 28, 2, 2, 'F');
  doc.setFontSize(7);
  doc.setTextColor(...MID);
  doc.text(docType === 'FACTURE' ? 'FACTURÉ À' : 'SOUMISSION POUR', 18, billY + 2);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(...DARK);
  doc.text(recipientName, 18, billY + 9);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(...MID);
  const billLines: string[] = [];
  if (recipientAddress) billLines.push(recipientAddress);
  if (recipientEmail)   billLines.push(recipientEmail);
  if (billLines.length) doc.text(billLines, 18, billY + 15);

  // ── Line items table ──────────────────────────────────────────────────
  const tableY = billY + 32;
  autoTable(doc, {
    startY: tableY,
    margin: { left: 14, right: 14 },
    head: [['Description', 'Qté', 'Prix unitaire', 'Total']],
    body: lines.map((l) => [
      l.label,
      String(l.qty),
      CAD(l.unitPrice),
      CAD(l.qty * l.unitPrice),
    ]),
    headStyles: {
      fillColor: DARK,
      textColor: [220, 220, 240],
      fontSize: 8,
      fontStyle: 'bold',
      halign: 'left',
    },
    columnStyles: {
      0: { cellWidth: 'auto' },
      1: { halign: 'center', cellWidth: 18 },
      2: { halign: 'right', cellWidth: 32 },
      3: { halign: 'right', cellWidth: 32 },
    },
    bodyStyles: { fontSize: 8.5, textColor: [40, 40, 50] },
    alternateRowStyles: { fillColor: [250, 250, 252] },
    tableLineColor: [220, 220, 230],
    tableLineWidth: 0.1,
  });

  // ── Tax summary ───────────────────────────────────────────────────────
  const taxes = computeTaxes(lines, gstRate, qstRate);
  // @ts-expect-error jspdf-autotable extends doc with lastAutoTable
  const afterTable: number = (doc.lastAutoTable?.finalY ?? tableY + 20) + 6;

  const sumX = pw - 14;
  let sy = afterTable;

  const row = (label: string, value: string, bold = false) => {
    doc.setFont('helvetica', bold ? 'bold' : 'normal');
    doc.setFontSize(bold ? 9.5 : 8.5);
    doc.setTextColor(bold ? DARK[0] : MID[0], bold ? DARK[1] : MID[1], bold ? DARK[2] : MID[2]);
    doc.text(label, sumX - 38, sy);
    doc.text(value, sumX, sy, { align: 'right' });
    sy += 6;
  };

  row('Sous-total', CAD(taxes.subtotal));
  row(`TPS (${(gstRate * 100).toFixed(1)} %)`, CAD(taxes.gst));
  row(`TVQ (${(qstRate * 100).toFixed(3)} %)`, CAD(taxes.qst));

  // Separator
  doc.setDrawColor(...ACCENT);
  doc.setLineWidth(0.4);
  doc.line(sumX - 60, sy - 1, sumX, sy - 1);
  sy += 2;

  row('Total', CAD(taxes.total), true);

  // ── Notes ─────────────────────────────────────────────────────────────
  if (notes) {
    const notesY = sy + 10;
    doc.setFillColor(...LIGHT);
    doc.roundedRect(14, notesY - 4, pw - 28, 18, 2, 2, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(...MID);
    doc.text('NOTES', 18, notesY + 1);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(...DARK);
    const wrapped = doc.splitTextToSize(notes, pw - 36) as string[];
    doc.text(wrapped.slice(0, 3), 18, notesY + 7);
  }

  // ── Footer ────────────────────────────────────────────────────────────
  const ph = doc.internal.pageSize.getHeight();
  doc.setFillColor(...DARK);
  doc.rect(0, ph - 12, pw, 12, 'F');
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(120, 120, 140);
  doc.text('Merci de votre confiance — ' + company.name, pw / 2, ph - 5, { align: 'center' });

  return doc;
}

export function downloadInvoicePDF(
  inv: Invoice,
  clientName: string,
  clientAddress: string | undefined,
  clientEmail: string | undefined,
  company: Company,
): void {
  const doc = buildDoc(
    inv.number,
    'FACTURE',
    `Émise : ${prettyDate(inv.issueDate)}`,
    `Échéance : ${prettyDate(inv.dueDate)}`,
    clientName,
    clientAddress,
    clientEmail,
    inv.lines,
    inv.gstRate,
    inv.qstRate,
    company,
    inv.notes,
    company.gstNumber,
    company.qstNumber,
  );
  doc.save(`${inv.number}.pdf`);
}

export function downloadQuotePDF(
  q: Quote,
  recipientName: string,
  recipientAddress: string | undefined,
  recipientEmail: string | undefined,
  company: Company,
): void {
  const doc = buildDoc(
    q.number,
    'SOUMISSION',
    `Émise : ${prettyDate(q.issueDate)}`,
    `Valide jusqu'au : ${prettyDate(q.validUntil)}`,
    recipientName,
    recipientAddress,
    recipientEmail,
    q.lines,
    q.gstRate,
    q.qstRate,
    company,
    q.notes,
    company.gstNumber,
    company.qstNumber,
  );
  doc.save(`${q.number}.pdf`);
}
