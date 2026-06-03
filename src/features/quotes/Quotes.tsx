import { useState } from 'react';
import { Plus, FileSignature, Trash2, ArrowRightCircle, FileDown, Printer } from 'lucide-react';
import { useStore } from '@/store/useStore';
import type { Quote } from '@/domain/types';
import { Button } from '@/ui/Button';
import { Pill } from '@/ui/Pill';
import { Modal } from '@/ui/Modal';
import { Field, Input, Select, Textarea } from '@/ui/Field';
import { Money } from '@/ui/Money';
import { EmptyState } from '@/ui/EmptyState';
import { Toolbar, FilterTabs } from '@/ui/PageHeader';
import { LineItemsEditor, TaxSummary } from '@/features/billing/shared';
import { quoteStatus } from '@/domain/labels';
import { computeTaxes } from '@/domain/quebec';
import { prettyDate, todayISO, addDaysISO } from '@/domain/dates';
import { downloadQuotePDF } from '@/features/billing/pdf';

type Filter = 'all' | Quote['status'];

export function Quotes() {
  const quotes = useStore((s) => s.quotes);
  const clients = useStore((s) => s.clients);
  const company = useStore((s) => s.company);
  const convert = useStore((s) => s.convertQuoteToContract);
  const [filter, setFilter] = useState<Filter>('all');
  const [editing, setEditing] = useState<Quote | 'new' | null>(null);
  const [viewing, setViewing] = useState<string | null>(null);

  const list = Object.values(quotes)
    .filter((q) => filter === 'all' || q.status === filter)
    .sort((a, b) => (a.issueDate < b.issueDate ? 1 : -1));

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
            { value: 'accepted', label: 'Acceptées' },
            { value: 'declined', label: 'Refusées' },
          ]}
        />
        <div className="flex-1" />
        <Button variant="primary" onClick={() => setEditing('new')}>
          <Plus className="h-4 w-4" /> Nouvelle soumission
        </Button>
      </Toolbar>

      {list.length === 0 ? (
        <EmptyState icon={<FileSignature className="h-5 w-5" />} title="Aucune soumission" />
      ) : (
        <div className="grid gap-3 lg:grid-cols-2">
          {list.map((q) => {
            const total = computeTaxes(q.lines, q.gstRate, q.qstRate).total;
            const name = q.clientId ? clients[q.clientId]?.name : q.prospectName;
            return (
              <div
                key={q.id}
                className="bento-card cursor-pointer p-4 transition-colors hover:bg-white/[0.04]"
                onClick={() => setViewing(q.id)}
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-mono text-xs text-zinc-500">{q.number}</p>
                    <p className="font-medium text-zinc-100">{name ?? 'Prospect'}</p>
                  </div>
                  <Pill tone={quoteStatus[q.status].tone}>{quoteStatus[q.status].label}</Pill>
                </div>
                <div className="mt-3 flex items-center justify-between border-t border-white/5 pt-3">
                  <Money amount={total} className="num-display text-lg font-semibold text-zinc-100" />
                  <span className="text-xs text-zinc-600">valide jusqu'au {prettyDate(q.validUntil)}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {viewing && (
        <QuoteView
          id={viewing}
          onClose={() => setViewing(null)}
          onEdit={() => { const q = quotes[viewing]; setViewing(null); if (q) setEditing(q); }}
          onConvert={() => {
            convert(viewing);
            setViewing(null);
            alert('Soumission convertie en contrat. Voir Contrats.');
          }}
          company={company}
        />
      )}
      {editing && <QuoteForm quote={editing === 'new' ? null : editing} onClose={() => setEditing(null)} />}
    </div>
  );
}

function QuoteForm({ quote, onClose }: { quote: Quote | null; onClose: () => void }) {
  const clients = useStore((s) => s.clients);
  const company = useStore((s) => s.company);
  const upsert = useStore((s) => s.upsertQuote);
  const remove = useStore((s) => s.removeQuote);

  const [form, setForm] = useState<Omit<Quote, 'id' | 'createdAt' | 'number'> & { number?: string }>(
    quote ?? {
      prospectName: '', issueDate: todayISO(), validUntil: addDaysISO(todayISO(), 30),
      lines: [], gstRate: company.defaultGstRate, qstRate: company.defaultQstRate, status: 'draft',
    },
  );
  const set = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) => setForm((f) => ({ ...f, [k]: v }));

  return (
    <Modal
      open
      onClose={onClose}
      size="lg"
      title={quote ? `Soumission ${quote.number}` : 'Nouvelle soumission'}
      footer={
        <>
          {quote && (
            <Button variant="ghost" onClick={() => { if (confirm('Supprimer cette soumission ?')) { remove(quote.id); onClose(); } }}>
              <Trash2 className="h-4 w-4" /> Supprimer
            </Button>
          )}
          <Button variant="ghost" onClick={onClose}>Annuler</Button>
          <Button variant="primary" onClick={() => { upsert({ ...form, id: quote?.id, number: quote?.number }); onClose(); }}>
            Enregistrer
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Client existant">
            <Select value={form.clientId ?? ''} onChange={(e) => set('clientId', e.target.value || undefined)}>
              <option value="">— Nouveau prospect —</option>
              {Object.values(clients).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </Select>
          </Field>
          <Field label="Nom du prospect (si nouveau)">
            <Input value={form.prospectName ?? ''} onChange={(e) => set('prospectName', e.target.value)} disabled={!!form.clientId} />
          </Field>
          <Field label="Statut">
            <Select value={form.status} onChange={(e) => set('status', e.target.value as Quote['status'])}>
              {Object.entries(quoteStatus).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </Select>
          </Field>
          <Field label="Valide jusqu'au"><Input type="date" value={form.validUntil} onChange={(e) => set('validUntil', e.target.value)} /></Field>
        </div>
        <Field label="Lignes">
          <LineItemsEditor lines={form.lines} onChange={(lines) => set('lines', lines)} />
        </Field>
        <TaxSummary lines={form.lines} gstRate={form.gstRate} qstRate={form.qstRate} />
        <Field label="Notes"><Textarea value={form.notes ?? ''} onChange={(e) => set('notes', e.target.value)} /></Field>
      </div>
    </Modal>
  );
}

function QuoteView({
  id,
  onClose,
  onEdit,
  onConvert,
  company,
}: {
  id: string;
  onClose: () => void;
  onEdit: () => void;
  onConvert: () => void;
  company: ReturnType<typeof useStore.getState>['company'];
}) {
  const q = useStore((s) => s.quotes[id]);
  const clients = useStore((s) => s.clients);
  if (!q) return null;

  const client = q.clientId ? clients[q.clientId] : null;
  const recipientName = client?.name ?? q.prospectName ?? 'Prospect';
  const t = computeTaxes(q.lines, q.gstRate, q.qstRate);

  return (
    <Modal
      open
      onClose={onClose}
      size="lg"
      title={`Soumission ${q.number}`}
      footer={
        <>
          {!q.convertedContractId && q.status !== 'declined' && (
            <Button variant="soft" className="mr-auto" onClick={onConvert}>
              <ArrowRightCircle className="h-4 w-4" /> Convertir en contrat
            </Button>
          )}
          <Button
            variant="ghost"
            onClick={() => downloadQuotePDF(q, recipientName, client?.address, client?.email, company)}
          >
            <FileDown className="h-4 w-4" /> PDF
          </Button>
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
            <p className="font-mono text-sm text-zinc-300">{q.number}</p>
            <Pill tone={quoteStatus[q.status].tone}>{quoteStatus[q.status].label}</Pill>
            <p className="mt-2 text-xs text-zinc-500">Émise : {prettyDate(q.issueDate)}</p>
            <p className="text-xs text-zinc-500">Valide jusqu'au : {prettyDate(q.validUntil)}</p>
          </div>
        </div>

        <div className="rounded-xl bg-white/[0.03] p-3">
          <p className="text-[10px] uppercase tracking-wide text-zinc-600">Soumission pour</p>
          <p className="text-sm font-medium text-zinc-200">{recipientName}</p>
          {client?.address && <p className="text-xs text-zinc-500">{client.address}</p>}
          {client?.email && <p className="text-xs text-zinc-500">{client.email}</p>}
        </div>

        <table className="w-full text-sm">
          <thead className="text-[10px] uppercase tracking-wide text-zinc-600">
            <tr>
              <th className="py-1 text-left">Description</th>
              <th className="py-1 text-right">Qté</th>
              <th className="py-1 text-right">Prix</th>
              <th className="py-1 text-right">Total</th>
            </tr>
          </thead>
          <tbody>
            {q.lines.map((l) => (
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
          <QLine label="Sous-total" value={<Money amount={t.subtotal} />} />
          <QLine label="TPS" value={<Money amount={t.gst} />} />
          <QLine label="TVQ" value={<Money amount={t.qst} />} />
          <div className="border-t border-white/10 pt-1.5">
            <QLine label="Total" value={<Money amount={t.total} className="font-semibold text-zinc-100" />} />
          </div>
        </div>

        {q.notes && <p className="border-t border-white/5 pt-3 text-xs text-zinc-500">{q.notes}</p>}
      </div>
    </Modal>
  );
}

function QLine({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-zinc-500">{label}</span>
      <span className="text-zinc-300">{value}</span>
    </div>
  );
}
