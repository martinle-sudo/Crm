import { useMemo, useState } from 'react';
import { Plus, Receipt, Trash2, CheckCircle2, Printer } from 'lucide-react';
import { useStore } from '@/store/useStore';
import type { Invoice, PaymentMethod } from '@/domain/types';
import { Button } from '@/ui/Button';
import { Pill } from '@/ui/Pill';
import { Modal } from '@/ui/Modal';
import { Field, Input, Select, Textarea } from '@/ui/Field';
import { Money } from '@/ui/Money';
import { EmptyState } from '@/ui/EmptyState';
import { Toolbar, FilterTabs } from '@/ui/PageHeader';
import { LineItemsEditor, TaxSummary } from '@/features/billing/shared';
import { invoiceStatus, paymentMethod } from '@/domain/labels';
import { computeTaxes } from '@/domain/quebec';
import { prettyDate, todayISO, addDaysISO } from '@/domain/dates';
import { isOverdue } from '@/app/selectors';

type Filter = 'all' | Invoice['status'];

export function Invoices() {
  const invoices = useStore((s) => s.invoices);
  const clients = useStore((s) => s.clients);
  const company = useStore((s) => s.company);
  const [filter, setFilter] = useState<Filter>('all');
  const [editing, setEditing] = useState<Invoice | 'new' | null>(null);
  const [viewing, setViewing] = useState<string | null>(null);

  const list = useMemo(() => {
    return Object.values(invoices)
      .map((i) => (isOverdue(i) && i.status === 'sent' ? { ...i, status: 'overdue' as const } : i))
      .filter((i) => filter === 'all' || i.status === filter)
      .sort((a, b) => (a.issueDate < b.issueDate ? 1 : -1));
  }, [invoices, filter]);

  const outstanding = list
    .filter((i) => i.status !== 'paid' && i.status !== 'cancelled')
    .reduce((sum, i) => sum + computeTaxes(i.lines, i.gstRate, i.qstRate).total, 0);

  return (
    <div>
      <Toolbar>
        <FilterTabs
          value={filter}
          onChange={setFilter}
          options={[
            { value: 'all', label: 'Toutes' },
            { value: 'draft', label: 'Brouillons' },
            { value: 'sent', label: 'Envoyées' },
            { value: 'paid', label: 'Payées' },
            { value: 'overdue', label: 'En retard' },
          ]}
        />
        <div className="flex-1" />
        <span className="text-xs text-zinc-500">À encaisser : <Money amount={outstanding} className="text-zinc-200" /></span>
        <Button variant="primary" onClick={() => setEditing('new')}>
          <Plus className="h-4 w-4" /> Nouvelle facture
        </Button>
      </Toolbar>

      {list.length === 0 ? (
        <EmptyState icon={<Receipt className="h-5 w-5" />} title="Aucune facture" />
      ) : (
        <div className="overflow-hidden rounded-2xl border border-white/5">
          <table className="w-full text-sm">
            <thead className="bg-white/[0.03] text-[10px] uppercase tracking-wide text-zinc-500">
              <tr>
                <th className="px-4 py-2.5 text-left">N°</th>
                <th className="px-4 py-2.5 text-left">Client</th>
                <th className="hidden px-4 py-2.5 text-left sm:table-cell">Émise</th>
                <th className="hidden px-4 py-2.5 text-left md:table-cell">Échéance</th>
                <th className="px-4 py-2.5 text-right">Total</th>
                <th className="px-4 py-2.5 text-left">Statut</th>
              </tr>
            </thead>
            <tbody>
              {list.map((i) => {
                const total = computeTaxes(i.lines, i.gstRate, i.qstRate).total;
                return (
                  <tr
                    key={i.id}
                    onClick={() => setViewing(i.id)}
                    className="cursor-pointer border-t border-white/5 hover:bg-white/[0.02]"
                  >
                    <td className="px-4 py-3 font-mono text-xs text-zinc-400">{i.number}</td>
                    <td className="px-4 py-3 text-zinc-200">{clients[i.clientId]?.name ?? '—'}</td>
                    <td className="hidden px-4 py-3 text-zinc-500 sm:table-cell">{prettyDate(i.issueDate)}</td>
                    <td className="hidden px-4 py-3 text-zinc-500 md:table-cell">{prettyDate(i.dueDate)}</td>
                    <td className="px-4 py-3 text-right text-zinc-200"><Money amount={total} /></td>
                    <td className="px-4 py-3"><Pill tone={invoiceStatus[i.status].tone}>{invoiceStatus[i.status].label}</Pill></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {editing && <InvoiceForm invoice={editing === 'new' ? null : editing} onClose={() => setEditing(null)} />}
      {viewing && (
        <InvoiceView
          id={viewing}
          onClose={() => setViewing(null)}
          onEdit={() => { const inv = invoices[viewing]; setViewing(null); if (inv) setEditing(inv); }}
          company={company}
        />
      )}
    </div>
  );
}

function InvoiceForm({ invoice, onClose }: { invoice: Invoice | null; onClose: () => void }) {
  const clients = useStore((s) => s.clients);
  const company = useStore((s) => s.company);
  const upsert = useStore((s) => s.upsertInvoice);
  const remove = useStore((s) => s.removeInvoice);

  const [form, setForm] = useState<Omit<Invoice, 'id' | 'createdAt' | 'number'> & { number?: string }>(
    invoice ?? {
      clientId: Object.keys(clients)[0] ?? '', issueDate: todayISO(), dueDate: addDaysISO(todayISO(), 30),
      lines: [], gstRate: company.defaultGstRate, qstRate: company.defaultQstRate, status: 'draft',
    },
  );
  const set = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) => setForm((f) => ({ ...f, [k]: v }));

  return (
    <Modal
      open
      onClose={onClose}
      size="lg"
      title={invoice ? `Facture ${invoice.number}` : 'Nouvelle facture'}
      footer={
        <>
          {invoice && (
            <Button variant="ghost" onClick={() => { if (confirm('Supprimer cette facture ?')) { remove(invoice.id); onClose(); } }}>
              <Trash2 className="h-4 w-4" /> Supprimer
            </Button>
          )}
          <Button variant="ghost" onClick={onClose}>Annuler</Button>
          <Button variant="primary" onClick={() => { if (!form.clientId) return; upsert({ ...form, id: invoice?.id, number: invoice?.number }); onClose(); }}>
            Enregistrer
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Client *">
            <Select value={form.clientId} onChange={(e) => set('clientId', e.target.value)}>
              {Object.values(clients).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </Select>
          </Field>
          <Field label="Statut">
            <Select value={form.status} onChange={(e) => set('status', e.target.value as Invoice['status'])}>
              {Object.entries(invoiceStatus).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </Select>
          </Field>
          <Field label="Date d’émission"><Input type="date" value={form.issueDate} onChange={(e) => set('issueDate', e.target.value)} /></Field>
          <Field label="Échéance"><Input type="date" value={form.dueDate} onChange={(e) => set('dueDate', e.target.value)} /></Field>
        </div>
        <Field label="Lignes de facturation">
          <LineItemsEditor lines={form.lines} onChange={(lines) => set('lines', lines)} />
        </Field>
        <TaxSummary lines={form.lines} gstRate={form.gstRate} qstRate={form.qstRate} />
        <Field label="Notes">
          <Textarea value={form.notes ?? ''} onChange={(e) => set('notes', e.target.value)} placeholder="Merci de votre confiance !" />
        </Field>
      </div>
    </Modal>
  );
}

function InvoiceView({
  id, onClose, onEdit, company,
}: {
  id: string;
  onClose: () => void;
  onEdit: () => void;
  company: ReturnType<typeof useStore.getState>['company'];
}) {
  const inv = useStore((s) => s.invoices[id]);
  const clients = useStore((s) => s.clients);
  const markPaid = useStore((s) => s.markInvoicePaid);
  const [method, setMethod] = useState<PaymentMethod>('transfer');
  if (!inv) return null;
  const client = clients[inv.clientId];
  const t = computeTaxes(inv.lines, inv.gstRate, inv.qstRate);

  return (
    <Modal
      open
      onClose={onClose}
      size="lg"
      title={`Facture ${inv.number}`}
      footer={
        <>
          {inv.status !== 'paid' && (
            <div className="mr-auto flex items-center gap-2">
              <Select value={method} onChange={(e) => setMethod(e.target.value as PaymentMethod)} className="!w-auto !py-1.5 text-xs">
                {Object.entries(paymentMethod).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
              </Select>
              <Button variant="soft" onClick={() => { markPaid(id, method); onClose(); }}>
                <CheckCircle2 className="h-4 w-4" /> Marquer payée
              </Button>
            </div>
          )}
          <Button variant="ghost" onClick={() => window.print()}><Printer className="h-4 w-4" /> Imprimer</Button>
          <Button variant="primary" onClick={onEdit}>Modifier</Button>
        </>
      }
    >
      <div className="space-y-5 rounded-2xl bg-white/[0.02] p-5">
        <div className="flex items-start justify-between">
          <div>
            <p className="font-display text-lg font-semibold text-zinc-100">{company.name}</p>
            <p className="text-xs text-zinc-500">{company.address}</p>
            <p className="text-xs text-zinc-500">{[company.city, company.postalCode].filter(Boolean).join(', ')}</p>
            {company.gstNumber && <p className="mt-1 text-[10px] text-zinc-600">TPS {company.gstNumber} · TVQ {company.qstNumber}</p>}
          </div>
          <div className="text-right">
            <p className="font-mono text-sm text-zinc-300">{inv.number}</p>
            <Pill tone={invoiceStatus[inv.status].tone}>{invoiceStatus[inv.status].label}</Pill>
            <p className="mt-2 text-xs text-zinc-500">Émise : {prettyDate(inv.issueDate)}</p>
            <p className="text-xs text-zinc-500">Échéance : {prettyDate(inv.dueDate)}</p>
          </div>
        </div>

        <div className="rounded-xl bg-white/[0.03] p-3">
          <p className="text-[10px] uppercase tracking-wide text-zinc-600">Facturé à</p>
          <p className="text-sm font-medium text-zinc-200">{client?.name}</p>
          {client?.address && <p className="text-xs text-zinc-500">{client.address}</p>}
          {client?.email && <p className="text-xs text-zinc-500">{client.email}</p>}
        </div>

        <table className="w-full text-sm">
          <thead className="text-[10px] uppercase tracking-wide text-zinc-600">
            <tr><th className="py-1 text-left">Description</th><th className="py-1 text-right">Qté</th><th className="py-1 text-right">Prix</th><th className="py-1 text-right">Total</th></tr>
          </thead>
          <tbody>
            {inv.lines.map((l) => (
              <tr key={l.id} className="border-t border-white/5">
                <td className="py-2 text-zinc-300">{l.label}</td>
                <td className="py-2 text-right text-zinc-400">{l.qty}</td>
                <td className="py-2 text-right text-zinc-400"><Money amount={l.unitPrice} /></td>
                <td className="py-2 text-right text-zinc-200"><Money amount={l.qty * l.unitPrice} /></td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="ml-auto w-full max-w-[260px] space-y-1.5 text-sm">
          <Line label="Sous-total" value={<Money amount={t.subtotal} />} />
          <Line label="TPS" value={<Money amount={t.gst} />} />
          <Line label="TVQ" value={<Money amount={t.qst} />} />
          <div className="border-t border-white/10 pt-1.5">
            <Line label="Total" value={<Money amount={t.total} className="font-semibold text-zinc-100" />} />
          </div>
          {inv.paidDate && <p className="pt-1 text-right text-xs text-neon-mint">Payée le {prettyDate(inv.paidDate)} · {inv.paymentMethod && paymentMethod[inv.paymentMethod].label}</p>}
        </div>

        {inv.notes && <p className="border-t border-white/5 pt-3 text-xs text-zinc-500">{inv.notes}</p>}
      </div>
    </Modal>
  );
}

function Line({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-zinc-500">{label}</span>
      <span className="text-zinc-300">{value}</span>
    </div>
  );
}
