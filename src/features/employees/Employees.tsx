import { useState } from 'react';
import { Plus, UserCog, Pencil, Trash2, Mail, Phone } from 'lucide-react';
import { useStore } from '@/store/useStore';
import type { Employee } from '@/domain/types';
import { Button } from '@/ui/Button';
import { Pill } from '@/ui/Pill';
import { Avatar } from '@/ui/Avatar';
import { Modal } from '@/ui/Modal';
import { Field, Input, Select, Textarea } from '@/ui/Field';
import { MoneyInput } from '@/ui/MoneyInput';
import { Money } from '@/ui/Money';
import { EmptyState } from '@/ui/EmptyState';
import { Toolbar } from '@/ui/PageHeader';
import { employeeRole, weekdays } from '@/domain/labels';
import { todayISO } from '@/domain/dates';
import { cn } from '@/ui/cn';

const empty: Omit<Employee, 'id'> = {
  firstName: '', lastName: '', role: 'cleaner', email: '', phone: '',
  hourlyRate: 20, active: true,
  availability: [false, true, true, true, true, true, false],
  hireDate: todayISO(),
};

export function Employees() {
  const employees = useStore((s) => s.employees);
  const interventions = useStore((s) => s.interventions);
  const [editing, setEditing] = useState<Employee | 'new' | null>(null);
  const list = Object.values(employees).sort((a, b) => a.firstName.localeCompare(b.firstName));

  const hoursOf = (id: string) =>
    Object.values(interventions)
      .filter((i) => i.assignedEmployeeIds.includes(id) && i.status === 'completed')
      .reduce((sum, i) => sum + (i.actualHours ?? i.durationMin / 60), 0);

  return (
    <div>
      <Toolbar>
        <p className="flex-1 text-sm text-zinc-500">{list.length} employé(s)</p>
        <Button variant="primary" onClick={() => setEditing('new')}>
          <Plus className="h-4 w-4" /> Nouvel employé
        </Button>
      </Toolbar>

      {list.length === 0 ? (
        <EmptyState icon={<UserCog className="h-5 w-5" />} title="Aucun employé" />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {list.map((e) => (
            <div key={e.id} className="bento-card p-4">
              <div className="flex items-start gap-3">
                <Avatar name={`${e.firstName} ${e.lastName}`} />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-zinc-100">{e.firstName} {e.lastName}</p>
                  <div className="mt-1 flex flex-wrap gap-1.5">
                    <Pill tone={employeeRole[e.role].tone}>{employeeRole[e.role].label}</Pill>
                    {!e.active && <Pill tone="neutral">Inactif</Pill>}
                  </div>
                  <div className="mt-2 space-y-1 text-xs text-zinc-500">
                    {e.phone && <p className="flex items-center gap-1.5"><Phone className="h-3 w-3" /> {e.phone}</p>}
                    {e.email && <p className="flex items-center gap-1.5 truncate"><Mail className="h-3 w-3" /> {e.email}</p>}
                  </div>
                </div>
              </div>
              <div className="mt-3 flex items-center justify-between border-t border-white/5 pt-3 text-xs text-zinc-500">
                <span><Money amount={e.hourlyRate} />/h</span>
                <span>{Math.round(hoursOf(e.id))} h travaillées</span>
              </div>
              <div className="mt-2 flex gap-1">
                {weekdays.map((d, i) => (
                  <span
                    key={i}
                    className={cn(
                      'flex h-6 flex-1 items-center justify-center rounded text-[10px]',
                      e.availability[i] ? 'bg-neon-mint/15 text-neon-mint' : 'bg-white/[0.03] text-zinc-600',
                    )}
                  >
                    {d[0]}
                  </span>
                ))}
              </div>
              <Button size="sm" variant="soft" className="mt-3 w-full" onClick={() => setEditing(e)}>
                <Pencil className="h-3 w-3" /> Modifier
              </Button>
            </div>
          ))}
        </div>
      )}

      {editing && (
        <EmployeeForm employee={editing === 'new' ? null : editing} onClose={() => setEditing(null)} />
      )}
    </div>
  );
}

function EmployeeForm({ employee, onClose }: { employee: Employee | null; onClose: () => void }) {
  const upsert = useStore((s) => s.upsertEmployee);
  const remove = useStore((s) => s.removeEmployee);
  const [form, setForm] = useState<Omit<Employee, 'id'>>(employee ?? empty);
  const set = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const toggleDay = (i: number) =>
    set('availability', form.availability.map((a, idx) => (idx === i ? !a : a)));

  return (
    <Modal
      open
      onClose={onClose}
      title={employee ? 'Modifier l’employé' : 'Nouvel employé'}
      footer={
        <>
          {employee && (
            <Button variant="ghost" onClick={() => { if (confirm('Supprimer cet employé ?')) { remove(employee.id); onClose(); } }}>
              <Trash2 className="h-4 w-4" /> Supprimer
            </Button>
          )}
          <Button variant="ghost" onClick={onClose}>Annuler</Button>
          <Button variant="primary" onClick={() => { if (!form.firstName.trim()) return; upsert({ ...form, id: employee?.id }); onClose(); }}>
            Enregistrer
          </Button>
        </>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Prénom *"><Input value={form.firstName} onChange={(e) => set('firstName', e.target.value)} /></Field>
        <Field label="Nom"><Input value={form.lastName} onChange={(e) => set('lastName', e.target.value)} /></Field>
        <Field label="Poste">
          <Select value={form.role} onChange={(e) => set('role', e.target.value as Employee['role'])}>
            {Object.entries(employeeRole).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </Select>
        </Field>
        <Field label="Taux horaire ($)">
          <MoneyInput value={form.hourlyRate} onChange={(v) => set('hourlyRate', v)}
            className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-zinc-100 outline-none focus:border-neon-violet/50" />
        </Field>
        <Field label="Téléphone"><Input value={form.phone ?? ''} onChange={(e) => set('phone', e.target.value)} /></Field>
        <Field label="Courriel"><Input type="email" value={form.email ?? ''} onChange={(e) => set('email', e.target.value)} /></Field>
        <Field label="Date d’embauche"><Input type="date" value={form.hireDate} onChange={(e) => set('hireDate', e.target.value)} /></Field>
        <Field label="Disponibilités" className="sm:col-span-2">
          <div className="flex gap-1.5">
            {weekdays.map((d, i) => (
              <button
                key={i}
                type="button"
                onClick={() => toggleDay(i)}
                className={cn(
                  'flex-1 rounded-lg py-2 text-xs font-medium transition-colors',
                  form.availability[i] ? 'bg-neon-mint/15 text-neon-mint ring-1 ring-inset ring-neon-mint/30' : 'bg-white/[0.03] text-zinc-500',
                )}
              >
                {d}
              </button>
            ))}
          </div>
        </Field>
        <Field label="Notes RH" className="sm:col-span-2">
          <Textarea value={form.notes ?? ''} onChange={(e) => set('notes', e.target.value)} />
        </Field>
        <label className="flex items-center gap-2 text-sm text-zinc-300 sm:col-span-2">
          <input type="checkbox" checked={form.active} onChange={(e) => set('active', e.target.checked)} className="h-4 w-4 accent-neon-violet" />
          Employé actif
        </label>
      </div>
    </Modal>
  );
}
