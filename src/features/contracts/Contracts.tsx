import { useState } from 'react';
import { Plus, FileText, Pencil, Trash2, CalendarPlus, Repeat } from 'lucide-react';
import { useStore } from '@/store/useStore';
import type { Contract } from '@/domain/types';
import { Button } from '@/ui/Button';
import { Pill } from '@/ui/Pill';
import { Modal } from '@/ui/Modal';
import { Field, Input, Select, Textarea } from '@/ui/Field';
import { MoneyInput } from '@/ui/MoneyInput';
import { Money } from '@/ui/Money';
import { EmptyState } from '@/ui/EmptyState';
import { Toolbar, FilterTabs } from '@/ui/PageHeader';
import { frequency, contractStatus, weekdaysLong } from '@/domain/labels';
import { contractVisitAmount } from '@/domain/scheduling';
import { prettyDate } from '@/domain/dates';
import { cn } from '@/ui/cn';

const empty: Omit<Contract, 'id' | 'createdAt'> = {
  clientId: '', title: '', frequency: 'biweekly', weekday: 2, startTime: '09:00',
  startDate: '', status: 'active', autoRenew: true, serviceIds: [],
  assignedEmployeeIds: [], notes: '',
};

type Filter = 'all' | Contract['status'];

export function Contracts() {
  const contracts = useStore((s) => s.contracts);
  const clients = useStore((s) => s.clients);
  const services = useStore((s) => s.services);
  const generate = useStore((s) => s.generateInterventions);
  const [editing, setEditing] = useState<Contract | 'new' | null>(null);
  const [filter, setFilter] = useState<Filter>('all');

  const list = Object.values(contracts)
    .filter((c) => filter === 'all' || c.status === filter)
    .sort((a, b) => a.title.localeCompare(b.title));

  return (
    <div>
      <Toolbar>
        <FilterTabs
          value={filter}
          onChange={setFilter}
          options={[
            { value: 'all', label: 'Tous' },
            { value: 'active', label: 'Actifs' },
            { value: 'suspended', label: 'Suspendus' },
            { value: 'cancelled', label: 'Annulés' },
          ]}
        />
        <div className="flex-1" />
        <Button variant="primary" onClick={() => setEditing('new')}>
          <Plus className="h-4 w-4" /> Nouveau contrat
        </Button>
      </Toolbar>

      {list.length === 0 ? (
        <EmptyState icon={<FileText className="h-5 w-5" />} title="Aucun contrat" />
      ) : (
        <div className="grid gap-3 lg:grid-cols-2">
          {list.map((c) => {
            const client = clients[c.clientId];
            const amount = contractVisitAmount(c, services);
            return (
              <div key={c.id} className="bento-card p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate font-medium text-zinc-100">{c.title}</p>
                    <p className="text-xs text-zinc-500">{client?.name ?? 'Client inconnu'}</p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <Pill tone={contractStatus[c.status].tone}>{contractStatus[c.status].label}</Pill>
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-zinc-500">
                  <Pill tone={frequency[c.frequency].tone}>{frequency[c.frequency].label}</Pill>
                  {c.frequency !== 'oneoff' && <span>{weekdaysLong[c.weekday]} · {c.startTime}</span>}
                  {c.autoRenew && <span className="flex items-center gap-1"><Repeat className="h-3 w-3" /> Renouvellement auto</span>}
                </div>
                <div className="mt-3 flex items-center justify-between border-t border-white/5 pt-3">
                  <span className="text-sm text-zinc-300"><Money amount={amount} /> <span className="text-xs text-zinc-500">/ visite</span></span>
                  <span className="text-xs text-zinc-600">dès le {prettyDate(c.startDate)}</span>
                </div>
                <div className="mt-3 flex gap-2">
                  <Button size="sm" variant="soft" className="flex-1" onClick={() => setEditing(c)}>
                    <Pencil className="h-3 w-3" /> Modifier
                  </Button>
                  <Button
                    size="sm"
                    variant="soft"
                    onClick={() => {
                      const n = generate(c.id, 60);
                      alert(n > 0 ? `${n} intervention(s) planifiée(s) sur les 60 prochains jours.` : 'Aucune nouvelle occurrence à planifier.');
                    }}
                    title="Générer les interventions à venir"
                  >
                    <CalendarPlus className="h-3 w-3" /> Planifier
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {editing && (
        <ContractForm contract={editing === 'new' ? null : editing} onClose={() => setEditing(null)} />
      )}
    </div>
  );
}

function ContractForm({ contract, onClose }: { contract: Contract | null; onClose: () => void }) {
  const clients = useStore((s) => s.clients);
  const services = useStore((s) => s.services);
  const employees = useStore((s) => s.employees);
  const upsert = useStore((s) => s.upsertContract);
  const remove = useStore((s) => s.removeContract);

  const [form, setForm] = useState<Omit<Contract, 'id' | 'createdAt'>>(
    contract ?? { ...empty, startDate: new Date().toISOString().slice(0, 10), clientId: Object.keys(clients)[0] ?? '' },
  );
  const set = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const toggleId = (field: 'serviceIds' | 'assignedEmployeeIds', id: string) =>
    set(field, form[field].includes(id) ? form[field].filter((x) => x !== id) : [...form[field], id]);

  return (
    <Modal
      open
      onClose={onClose}
      size="lg"
      title={contract ? 'Modifier le contrat' : 'Nouveau contrat'}
      footer={
        <>
          {contract && (
            <Button variant="ghost" onClick={() => { if (confirm('Supprimer ce contrat ?')) { remove(contract.id); onClose(); } }}>
              <Trash2 className="h-4 w-4" /> Supprimer
            </Button>
          )}
          <Button variant="ghost" onClick={onClose}>Annuler</Button>
          <Button variant="primary" onClick={() => { if (!form.clientId || !form.title.trim()) return; upsert({ ...form, id: contract?.id }); onClose(); }}>
            Enregistrer
          </Button>
        </>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Titre du contrat *" className="sm:col-span-2">
          <Input value={form.title} onChange={(e) => set('title', e.target.value)} placeholder="Ménage bi-hebdo résidentiel" />
        </Field>
        <Field label="Client *">
          <Select value={form.clientId} onChange={(e) => set('clientId', e.target.value)}>
            <option value="">— Choisir —</option>
            {Object.values(clients).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </Select>
        </Field>
        <Field label="Statut">
          <Select value={form.status} onChange={(e) => set('status', e.target.value as Contract['status'])}>
            {Object.entries(contractStatus).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </Select>
        </Field>
        <Field label="Fréquence">
          <Select value={form.frequency} onChange={(e) => set('frequency', e.target.value as Contract['frequency'])}>
            {Object.entries(frequency).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </Select>
        </Field>
        <Field label="Jour de la semaine">
          <Select value={form.weekday} onChange={(e) => set('weekday', Number(e.target.value))} disabled={form.frequency === 'oneoff'}>
            {weekdaysLong.map((d, i) => <option key={i} value={i}>{d}</option>)}
          </Select>
        </Field>
        <Field label="Heure de début"><Input type="time" value={form.startTime} onChange={(e) => set('startTime', e.target.value)} /></Field>
        <Field label="Date de début"><Input type="date" value={form.startDate} onChange={(e) => set('startDate', e.target.value)} /></Field>
        <Field label="Date de fin (optionnel)"><Input type="date" value={form.endDate ?? ''} onChange={(e) => set('endDate', e.target.value || undefined)} /></Field>
        <Field label="Montant par visite (optionnel — remplace le calcul automatique)">
          <MoneyInput value={form.amountOverride ?? 0} onChange={(v) => set('amountOverride', v || undefined)}
            className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-zinc-100 outline-none focus:border-neon-violet/50" />
        </Field>

        <Field label="Services inclus" className="sm:col-span-2">
          <ChipPicker
            items={Object.values(services).map((s) => ({ id: s.id, label: s.name }))}
            selected={form.serviceIds}
            onToggle={(id) => toggleId('serviceIds', id)}
          />
        </Field>
        <Field label="Employés assignés" className="sm:col-span-2">
          <ChipPicker
            items={Object.values(employees).map((e) => ({ id: e.id, label: `${e.firstName} ${e.lastName}` }))}
            selected={form.assignedEmployeeIds}
            onToggle={(id) => toggleId('assignedEmployeeIds', id)}
          />
        </Field>
        <Field label="Notes" className="sm:col-span-2">
          <Textarea value={form.notes ?? ''} onChange={(e) => set('notes', e.target.value)} />
        </Field>
        <label className="flex items-center gap-2 text-sm text-zinc-300 sm:col-span-2">
          <input type="checkbox" checked={form.autoRenew} onChange={(e) => set('autoRenew', e.target.checked)} className="h-4 w-4 accent-neon-violet" />
          Renouvellement automatique
        </label>
      </div>
    </Modal>
  );
}

export function ChipPicker({
  items,
  selected,
  onToggle,
}: {
  items: { id: string; label: string }[];
  selected: string[];
  onToggle: (id: string) => void;
}) {
  if (items.length === 0) return <p className="text-xs text-zinc-600">Aucun élément disponible.</p>;
  return (
    <div className="flex flex-wrap gap-1.5">
      {items.map((it) => {
        const on = selected.includes(it.id);
        return (
          <button
            key={it.id}
            type="button"
            onClick={() => onToggle(it.id)}
            className={cn(
              'rounded-lg px-3 py-1.5 text-xs font-medium transition-colors',
              on ? 'bg-neon-violet/15 text-neon-violet ring-1 ring-inset ring-neon-violet/30' : 'bg-white/[0.03] text-zinc-400 hover:text-zinc-200',
            )}
          >
            {it.label}
          </button>
        );
      })}
    </div>
  );
}
