import { useState } from 'react';
import { Plus, Filter, ChevronLeft, ChevronRight, Trash2, CalendarClock } from 'lucide-react';
import { useStore } from '@/store/useStore';
import type { Lead, LeadStage } from '@/domain/types';
import { Button } from '@/ui/Button';
import { Pill } from '@/ui/Pill';
import { Modal } from '@/ui/Modal';
import { Field, Input, Select, Textarea } from '@/ui/Field';
import { Money } from '@/ui/Money';
import { Toolbar } from '@/ui/PageHeader';
import { leadStage, leadSource, clientType } from '@/domain/labels';
import { prettyDate } from '@/domain/dates';

const STAGES: LeadStage[] = ['new', 'contacted', 'quoted', 'won', 'lost'];

export function Leads() {
  const leads = useStore((s) => s.leads);
  const setStage = useStore((s) => s.setLeadStage);
  const [editing, setEditing] = useState<Lead | 'new' | null>(null);

  const all = Object.values(leads);
  const won = all.filter((l) => l.stage === 'won');
  const closed = all.filter((l) => l.stage === 'won' || l.stage === 'lost');
  const convRate = closed.length ? Math.round((won.length / closed.length) * 100) : 0;
  const pipelineValue = all
    .filter((l) => l.stage !== 'won' && l.stage !== 'lost')
    .reduce((sum, l) => sum + (l.estimatedValue ?? 0), 0);

  const move = (lead: Lead, dir: -1 | 1) => {
    const idx = STAGES.indexOf(lead.stage);
    const next = STAGES[idx + dir];
    if (next) setStage(lead.id, next);
  };

  return (
    <div>
      <Toolbar>
        <div className="flex flex-wrap items-center gap-4 text-sm text-zinc-500">
          <span>Pipeline actif : <Money amount={pipelineValue} className="text-zinc-200" /></span>
          <span>Taux de conversion : <span className="text-neon-mint">{convRate} %</span></span>
        </div>
        <div className="flex-1" />
        <Button variant="primary" onClick={() => setEditing('new')}>
          <Plus className="h-4 w-4" /> Nouveau prospect
        </Button>
      </Toolbar>

      <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-5">
        {STAGES.map((stage) => {
          const items = all.filter((l) => l.stage === stage);
          const value = items.reduce((sum, l) => sum + (l.estimatedValue ?? 0), 0);
          return (
            <div key={stage} className="flex flex-col rounded-2xl border border-white/5 bg-white/[0.015] p-2">
              <div className="flex items-center justify-between px-2 py-1.5">
                <Pill tone={leadStage[stage].tone}>{leadStage[stage].label}</Pill>
                <span className="text-[10px] text-zinc-600">{items.length}</span>
              </div>
              <p className="px-2 pb-2 text-[10px] text-zinc-600"><Money amount={value} compact /></p>
              <div className="flex flex-col gap-2">
                {items.map((l) => (
                  <div key={l.id} className="rounded-xl bg-white/[0.03] p-2.5">
                    <button onClick={() => setEditing(l)} className="w-full text-left">
                      <p className="text-sm font-medium text-zinc-100">{l.name}</p>
                      <div className="mt-1 flex flex-wrap gap-1">
                        <Pill tone={clientType[l.type].tone}>{clientType[l.type].label}</Pill>
                        <Pill tone={leadSource[l.source].tone}>{leadSource[l.source].label}</Pill>
                      </div>
                      {l.estimatedValue ? <p className="mt-1.5 text-xs text-zinc-400"><Money amount={l.estimatedValue} compact />/an</p> : null}
                      {l.nextFollowUp && (
                        <p className="mt-1 flex items-center gap-1 text-[10px] text-neon-amber">
                          <CalendarClock className="h-3 w-3" /> Relance {prettyDate(l.nextFollowUp)}
                        </p>
                      )}
                    </button>
                    <div className="mt-2 flex items-center justify-between">
                      <button onClick={() => move(l, -1)} disabled={STAGES.indexOf(l.stage) === 0} className="text-zinc-600 hover:text-zinc-300 disabled:opacity-20">
                        <ChevronLeft className="h-4 w-4" />
                      </button>
                      <button onClick={() => move(l, 1)} disabled={STAGES.indexOf(l.stage) === STAGES.length - 1} className="text-zinc-600 hover:text-zinc-300 disabled:opacity-20">
                        <ChevronRight className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
                {items.length === 0 && (
                  <div className="flex items-center justify-center gap-1.5 py-6 text-[10px] text-zinc-700">
                    <Filter className="h-3 w-3" /> vide
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {editing && <LeadForm lead={editing === 'new' ? null : editing} onClose={() => setEditing(null)} />}
    </div>
  );
}

function LeadForm({ lead, onClose }: { lead: Lead | null; onClose: () => void }) {
  const upsert = useStore((s) => s.upsertLead);
  const remove = useStore((s) => s.removeLead);
  const [form, setForm] = useState<Omit<Lead, 'id' | 'createdAt'>>(
    lead ?? { name: '', type: 'residential', source: 'web', stage: 'new', estimatedValue: 0 },
  );
  const set = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) => setForm((f) => ({ ...f, [k]: v }));

  return (
    <Modal
      open
      onClose={onClose}
      title={lead ? 'Modifier le prospect' : 'Nouveau prospect'}
      footer={
        <>
          {lead && (
            <Button variant="ghost" onClick={() => { if (confirm('Supprimer ce prospect ?')) { remove(lead.id); onClose(); } }}>
              <Trash2 className="h-4 w-4" /> Supprimer
            </Button>
          )}
          <Button variant="ghost" onClick={onClose}>Annuler</Button>
          <Button variant="primary" onClick={() => { if (!form.name.trim()) return; upsert({ ...form, id: lead?.id }); onClose(); }}>
            Enregistrer
          </Button>
        </>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Nom *" className="sm:col-span-2"><Input value={form.name} onChange={(e) => set('name', e.target.value)} /></Field>
        <Field label="Type">
          <Select value={form.type} onChange={(e) => set('type', e.target.value as Lead['type'])}>
            <option value="residential">Résidentiel</option>
            <option value="commercial">Commercial</option>
          </Select>
        </Field>
        <Field label="Source">
          <Select value={form.source} onChange={(e) => set('source', e.target.value as Lead['source'])}>
            {Object.entries(leadSource).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </Select>
        </Field>
        <Field label="Étape">
          <Select value={form.stage} onChange={(e) => set('stage', e.target.value as Lead['stage'])}>
            {Object.entries(leadStage).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </Select>
        </Field>
        <Field label="Valeur estimée ($/an)"><Input type="number" value={form.estimatedValue ?? 0} onChange={(e) => set('estimatedValue', Number(e.target.value))} /></Field>
        <Field label="Personne-ressource"><Input value={form.contactName ?? ''} onChange={(e) => set('contactName', e.target.value)} /></Field>
        <Field label="Téléphone"><Input value={form.phone ?? ''} onChange={(e) => set('phone', e.target.value)} /></Field>
        <Field label="Courriel"><Input type="email" value={form.email ?? ''} onChange={(e) => set('email', e.target.value)} /></Field>
        <Field label="Prochaine relance"><Input type="date" value={form.nextFollowUp ?? ''} onChange={(e) => set('nextFollowUp', e.target.value || undefined)} /></Field>
        <Field label="Notes" className="sm:col-span-2"><Textarea value={form.notes ?? ''} onChange={(e) => set('notes', e.target.value)} /></Field>
      </div>
    </Modal>
  );
}
