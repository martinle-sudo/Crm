import { useMemo, useState } from 'react';
import {
  Plus, ClipboardCheck, Clock, Trash2, Receipt, CheckCircle2,
  PlayCircle, Calendar, Camera, X,
} from 'lucide-react';
import { useStore } from '@/store/useStore';
import type { Intervention, InterventionStatus } from '@/domain/types';
import { Button } from '@/ui/Button';
import { Pill } from '@/ui/Pill';
import { Modal } from '@/ui/Modal';
import { Field, Input, Select, Textarea } from '@/ui/Field';
import { Money } from '@/ui/Money';
import { EmptyState } from '@/ui/EmptyState';
import { Toolbar, FilterTabs } from '@/ui/PageHeader';
import { ChipPicker } from '@/features/contracts/Contracts';
import { interventionStatus } from '@/domain/labels';
import { prettyDate, todayISO } from '@/domain/dates';
import { employeeName } from '@/app/selectors';
import { cn } from '@/ui/cn';

type Filter = 'all' | InterventionStatus;

export function Interventions() {
  const interventions = useStore((s) => s.interventions);
  const clients = useStore((s) => s.clients);
  const [filter, setFilter] = useState<Filter>('all');
  const [detail, setDetail] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  const list = useMemo(
    () =>
      Object.values(interventions)
        .filter((i) => filter === 'all' || i.status === filter)
        .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : a.startTime.localeCompare(b.startTime))),
    [interventions, filter],
  );

  return (
    <div>
      <Toolbar>
        <FilterTabs
          value={filter}
          onChange={setFilter}
          options={[
            { value: 'all', label: 'Toutes' },
            { value: 'planned', label: 'Planifiées' },
            { value: 'inprogress', label: 'En cours' },
            { value: 'completed', label: 'Complétées' },
            { value: 'cancelled', label: 'Annulées' },
          ]}
        />
        <div className="flex-1" />
        <Button variant="primary" onClick={() => setCreating(true)}>
          <Plus className="h-4 w-4" /> Nouvelle intervention
        </Button>
      </Toolbar>

      {list.length === 0 ? (
        <EmptyState icon={<ClipboardCheck className="h-5 w-5" />} title="Aucune intervention" />
      ) : (
        <div className="space-y-2">
          {list.map((iv) => {
            const done = iv.checklist.filter((c) => c.done).length;
            return (
              <button
                key={iv.id}
                onClick={() => setDetail(iv.id)}
                className="bento-card flex w-full items-center gap-4 p-3 text-left"
              >
                <div className="flex w-16 shrink-0 flex-col items-center rounded-xl bg-white/[0.03] py-2">
                  <span className="text-[10px] uppercase text-zinc-500">{prettyDate(iv.date, { month: 'short' })}</span>
                  <span className="num-display text-lg font-semibold text-zinc-100">{iv.date.slice(8)}</span>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-zinc-100">{clients[iv.clientId]?.name ?? 'Client'}</p>
                  <p className="flex items-center gap-2 text-xs text-zinc-500">
                    <Clock className="h-3 w-3" /> {iv.startTime} · {Math.round(iv.durationMin / 60 * 10) / 10} h
                    {iv.checklist.length > 0 && <span>· {done}/{iv.checklist.length} tâches</span>}
                  </p>
                </div>
                <Money amount={iv.amount} className="hidden text-sm text-zinc-300 sm:block" />
                <Pill tone={interventionStatus[iv.status].tone}>{interventionStatus[iv.status].label}</Pill>
              </button>
            );
          })}
        </div>
      )}

      {detail && <InterventionDetail id={detail} onClose={() => setDetail(null)} />}
      {creating && <InterventionForm onClose={() => setCreating(false)} />}
    </div>
  );
}

function InterventionDetail({ id, onClose }: { id: string; onClose: () => void }) {
  const iv = useStore((s) => s.interventions[id]);
  const clients = useStore((s) => s.clients);
  const services = useStore((s) => s.services);
  const setStatus = useStore((s) => s.setInterventionStatus);
  const toggleItem = useStore((s) => s.toggleChecklistItem);
  const upsert = useStore((s) => s.upsertIntervention);
  const remove = useStore((s) => s.removeIntervention);
  const makeInvoice = useStore((s) => s.invoiceFromIntervention);
  const [hours, setHours] = useState(iv?.actualHours ?? '');
  const [noteAfter, setNoteAfter] = useState(iv?.notesAfter ?? '');
  const [photo, setPhoto] = useState('');

  if (!iv) return null;
  const client = clients[iv.clientId];

  return (
    <Modal
      open
      onClose={onClose}
      size="lg"
      title={`Intervention — ${client?.name ?? ''}`}
      subtitle={`${prettyDate(iv.date, { weekday: 'long', day: 'numeric', month: 'long' })} · ${iv.startTime}`}
      footer={
        <>
          <Button variant="ghost" onClick={() => { if (confirm('Supprimer cette intervention ?')) { remove(id); onClose(); } }}>
            <Trash2 className="h-4 w-4" /> Supprimer
          </Button>
          {iv.status === 'completed' && !iv.invoiceId && (
            <Button variant="soft" onClick={() => { makeInvoice(id); alert('Facture brouillon créée. Voir Facturation.'); }}>
              <Receipt className="h-4 w-4" /> Facturer
            </Button>
          )}
          <Button variant="primary" onClick={() => {
            upsert({ ...iv, actualHours: hours === '' ? undefined : Number(hours), notesAfter: noteAfter });
            onClose();
          }}>
            Enregistrer
          </Button>
        </>
      }
    >
      <div className="space-y-5">
        <div className="flex flex-wrap gap-2">
          {(['planned', 'inprogress', 'completed', 'cancelled'] as InterventionStatus[]).map((st) => (
            <button
              key={st}
              onClick={() => setStatus(id, st)}
              className={cn(
                'flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors',
                iv.status === st ? 'bg-neon-violet/15 text-neon-violet ring-1 ring-inset ring-neon-violet/30' : 'bg-white/[0.03] text-zinc-400 hover:text-zinc-200',
              )}
            >
              {st === 'completed' && <CheckCircle2 className="h-3 w-3" />}
              {st === 'inprogress' && <PlayCircle className="h-3 w-3" />}
              {interventionStatus[st].label}
            </button>
          ))}
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <Info label="Services" value={iv.serviceIds.map((s) => services[s]?.name).filter(Boolean).join(', ') || '—'} />
          <Info label="Équipe" value={iv.assignedEmployeeIds.map((e) => employeeName(useStore.getState(), e)).join(', ') || '—'} />
          <Info label="Montant" value={<Money amount={iv.amount} />} />
        </div>

        {iv.notesBefore && (
          <div className="rounded-xl bg-white/[0.03] p-3 text-sm text-zinc-400">
            <span className="text-[10px] uppercase tracking-wide text-zinc-600">Note avant intervention</span>
            <p className="mt-1">{iv.notesBefore}</p>
          </div>
        )}

        {iv.checklist.length > 0 && (
          <div>
            <p className="mb-2 text-[11px] uppercase tracking-[0.14em] text-zinc-500">Checklist des tâches</p>
            <div className="space-y-1.5">
              {iv.checklist.map((c) => (
                <button
                  key={c.id}
                  onClick={() => toggleItem(id, c.id)}
                  className="flex w-full items-center gap-2.5 rounded-xl bg-white/[0.02] px-3 py-2 text-left text-sm"
                >
                  <span className={cn('flex h-4 w-4 items-center justify-center rounded border', c.done ? 'border-neon-mint bg-neon-mint/20 text-neon-mint' : 'border-white/20')}>
                    {c.done && <CheckCircle2 className="h-3 w-3" />}
                  </span>
                  <span className={cn(c.done ? 'text-zinc-500 line-through' : 'text-zinc-300')}>{c.label}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Heures réelles travaillées">
            <Input type="number" step="0.25" value={hours} onChange={(e) => setHours(e.target.value)} placeholder={String(Math.round(iv.durationMin / 60 * 10) / 10)} />
          </Field>
          <Field label="Ajouter une photo (libellé / URL)">
            <div className="flex gap-2">
              <Input value={photo} onChange={(e) => setPhoto(e.target.value)} placeholder="avant-cuisine.jpg" />
              <Button variant="soft" onClick={() => { if (photo.trim()) { upsert({ ...iv, photos: [...iv.photos, photo.trim()] }); setPhoto(''); } }}>
                <Camera className="h-4 w-4" />
              </Button>
            </div>
          </Field>
        </div>

        {iv.photos.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {iv.photos.map((p, i) => (
              <span key={i} className="flex items-center gap-1.5 rounded-lg bg-white/[0.04] px-2.5 py-1 text-xs text-zinc-400">
                <Camera className="h-3 w-3" /> {p}
                <button onClick={() => upsert({ ...iv, photos: iv.photos.filter((_, idx) => idx !== i) })}>
                  <X className="h-3 w-3 text-zinc-600 hover:text-zinc-300" />
                </button>
              </span>
            ))}
          </div>
        )}

        <Field label="Note post-intervention">
          <Textarea value={noteAfter} onChange={(e) => setNoteAfter(e.target.value)} placeholder="Tout s'est bien déroulé…" />
        </Field>
      </div>
    </Modal>
  );
}

function Info({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-xl bg-white/[0.03] p-3">
      <p className="text-[10px] uppercase tracking-[0.14em] text-zinc-500">{label}</p>
      <p className="mt-1 text-sm text-zinc-200">{value}</p>
    </div>
  );
}

function InterventionForm({ onClose }: { onClose: () => void }) {
  const clients = useStore((s) => s.clients);
  const services = useStore((s) => s.services);
  const employees = useStore((s) => s.employees);
  const upsert = useStore((s) => s.upsertIntervention);

  const [form, setForm] = useState<Omit<Intervention, 'id' | 'createdAt'>>({
    clientId: Object.keys(clients)[0] ?? '', date: todayISO(), startTime: '09:00',
    durationMin: 120, status: 'planned', serviceIds: [], assignedEmployeeIds: [],
    checklist: [], amount: 0, photos: [],
  });
  const set = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const recomputeAmount = (ids: string[]) =>
    ids.reduce((sum, id) => {
      const s = services[id];
      return sum + (s ? (s.pricingMode === 'flat' ? s.unitPrice : s.unitPrice * (s.durationMin / 60)) : 0);
    }, 0);

  return (
    <Modal
      open
      onClose={onClose}
      title="Nouvelle intervention"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Annuler</Button>
          <Button variant="primary" onClick={() => { if (!form.clientId) return; upsert(form); onClose(); }}>
            <Calendar className="h-4 w-4" /> Planifier
          </Button>
        </>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Client *" className="sm:col-span-2">
          <Select value={form.clientId} onChange={(e) => set('clientId', e.target.value)}>
            <option value="">— Choisir —</option>
            {Object.values(clients).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </Select>
        </Field>
        <Field label="Date"><Input type="date" value={form.date} onChange={(e) => set('date', e.target.value)} /></Field>
        <Field label="Heure"><Input type="time" value={form.startTime} onChange={(e) => set('startTime', e.target.value)} /></Field>
        <Field label="Durée (minutes)"><Input type="number" value={form.durationMin} onChange={(e) => set('durationMin', Number(e.target.value))} /></Field>
        <Field label="Montant ($)"><Input type="number" value={form.amount} onChange={(e) => set('amount', Number(e.target.value))} /></Field>
        <Field label="Services" className="sm:col-span-2">
          <ChipPicker
            items={Object.values(services).map((s) => ({ id: s.id, label: s.name }))}
            selected={form.serviceIds}
            onToggle={(id) => {
              const next = form.serviceIds.includes(id) ? form.serviceIds.filter((x) => x !== id) : [...form.serviceIds, id];
              setForm((f) => ({ ...f, serviceIds: next, amount: recomputeAmount(next) }));
            }}
          />
        </Field>
        <Field label="Équipe assignée" className="sm:col-span-2">
          <ChipPicker
            items={Object.values(employees).map((e) => ({ id: e.id, label: `${e.firstName} ${e.lastName}` }))}
            selected={form.assignedEmployeeIds}
            onToggle={(id) => set('assignedEmployeeIds', form.assignedEmployeeIds.includes(id) ? form.assignedEmployeeIds.filter((x) => x !== id) : [...form.assignedEmployeeIds, id])}
          />
        </Field>
        <Field label="Note avant intervention" className="sm:col-span-2">
          <Textarea value={form.notesBefore ?? ''} onChange={(e) => set('notesBefore', e.target.value)} />
        </Field>
      </div>
    </Modal>
  );
}
