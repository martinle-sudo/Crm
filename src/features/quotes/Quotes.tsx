import { useState } from 'react';
import { Plus, FileSignature, Trash2, ArrowRightCircle } from 'lucide-react';
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

type Filter = 'all' | Quote['status'];

export function Quotes() {
  const quotes = useStore((s) => s.quotes);
  const clients = useStore((s) => s.clients);
  const convert = useStore((s) => s.convertQuoteToContract);
  const [filter, setFilter] = useState<Filter>('all');
  const [editing, setEditing] = useState<Quote | 'new' | null>(null);

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
              <div key={q.id} className="bento-card p-4">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-mono text-xs text-zinc-500">{q.number}</p>
                    <p className="font-medium text-zinc-100">{name ?? 'Prospect'}</p>
                  </div>
                  <Pill tone={quoteStatus[q.status].tone}>{quoteStatus[q.status].label}</Pill>
                </div>
                <div className="mt-3 flex items-center justify-between border-t border-white/5 pt-3">
                  <Money amount={total} className="num-display text-lg font-semibold text-zinc-100" />
                  <span className="text-xs text-zinc-600">valide jusqu’au {prettyDate(q.validUntil)}</span>
                </div>
                <div className="mt-3 flex gap-2">
                  <Button size="sm" variant="soft" className="flex-1" onClick={() => setEditing(q)}>Modifier</Button>
                  {!q.convertedContractId && q.status !== 'declined' && (
                    <Button
                      size="sm"
                      variant="soft"
                      onClick={() => { convert(q.id); alert('Soumission convertie en contrat. Voir Contrats.'); }}
                    >
                      <ArrowRightCircle className="h-3 w-3" /> Convertir
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
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
          <Field label="Valide jusqu’au"><Input type="date" value={form.validUntil} onChange={(e) => set('validUntil', e.target.value)} /></Field>
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
