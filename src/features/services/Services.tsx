import { useState } from 'react';
import { Plus, Sparkles, Clock, Pencil, Trash2 } from 'lucide-react';
import { useStore } from '@/store/useStore';
import type { Service } from '@/domain/types';
import { Button } from '@/ui/Button';
import { Pill } from '@/ui/Pill';
import { Modal } from '@/ui/Modal';
import { Field, Input, Select, Textarea } from '@/ui/Field';
import { MoneyInput } from '@/ui/MoneyInput';
import { Money } from '@/ui/Money';
import { EmptyState } from '@/ui/EmptyState';
import { Toolbar } from '@/ui/PageHeader';
import { serviceCategory } from '@/domain/labels';

const empty: Omit<Service, 'id'> = {
  name: '', description: '', category: 'regular', pricingMode: 'flat',
  unitPrice: 0, durationMin: 120, active: true,
};

export function Services() {
  const services = useStore((s) => s.services);
  const [editing, setEditing] = useState<Service | 'new' | null>(null);
  const list = Object.values(services).sort((a, b) => a.name.localeCompare(b.name));

  return (
    <div>
      <Toolbar>
        <p className="flex-1 text-sm text-zinc-500">
          {list.length} service{list.length > 1 ? 's' : ''} au catalogue
        </p>
        <Button variant="primary" onClick={() => setEditing('new')}>
          <Plus className="h-4 w-4" /> Nouveau service
        </Button>
      </Toolbar>

      {list.length === 0 ? (
        <EmptyState icon={<Sparkles className="h-5 w-5" />} title="Aucun service" />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {list.map((s) => (
            <div key={s.id} className="bento-card flex flex-col p-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-medium text-zinc-100">{s.name}</p>
                  <Pill tone={serviceCategory[s.category].tone} className="mt-1">
                    {serviceCategory[s.category].label}
                  </Pill>
                </div>
                {!s.active && <Pill tone="neutral">Inactif</Pill>}
              </div>
              {s.description && <p className="mt-2 text-xs text-zinc-500">{s.description}</p>}
              <div className="mt-3 flex items-end justify-between border-t border-white/5 pt-3">
                <div>
                  <Money amount={s.unitPrice} className="num-display text-lg font-semibold text-zinc-100" />
                  <span className="text-xs text-zinc-500">{s.pricingMode === 'hourly' ? ' /h' : ' /visite'}</span>
                </div>
                <span className="flex items-center gap-1 text-xs text-zinc-500">
                  <Clock className="h-3 w-3" /> {Math.round(s.durationMin / 60 * 10) / 10} h
                </span>
              </div>
              <div className="mt-3 flex gap-2">
                <Button size="sm" variant="soft" className="flex-1" onClick={() => setEditing(s)}>
                  <Pencil className="h-3 w-3" /> Modifier
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {editing && (
        <ServiceForm service={editing === 'new' ? null : editing} onClose={() => setEditing(null)} />
      )}
    </div>
  );
}

function ServiceForm({ service, onClose }: { service: Service | null; onClose: () => void }) {
  const upsert = useStore((s) => s.upsertService);
  const remove = useStore((s) => s.removeService);
  const [form, setForm] = useState<Omit<Service, 'id'>>(service ?? empty);
  const set = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  return (
    <Modal
      open
      onClose={onClose}
      title={service ? 'Modifier le service' : 'Nouveau service'}
      footer={
        <>
          {service && (
            <Button
              variant="ghost"
              onClick={() => {
                if (confirm('Supprimer ce service ?')) {
                  remove(service.id);
                  onClose();
                }
              }}
            >
              <Trash2 className="h-4 w-4" /> Supprimer
            </Button>
          )}
          <Button variant="ghost" onClick={onClose}>Annuler</Button>
          <Button
            variant="primary"
            onClick={() => {
              if (!form.name.trim()) return;
              upsert({ ...form, id: service?.id });
              onClose();
            }}
          >
            Enregistrer
          </Button>
        </>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Nom *" className="sm:col-span-2">
          <Input value={form.name} onChange={(e) => set('name', e.target.value)} />
        </Field>
        <Field label="Catégorie">
          <Select value={form.category} onChange={(e) => set('category', e.target.value as Service['category'])}>
            {Object.entries(serviceCategory).map(([k, v]) => (
              <option key={k} value={k}>{v.label}</option>
            ))}
          </Select>
        </Field>
        <Field label="Mode de tarification">
          <Select value={form.pricingMode} onChange={(e) => set('pricingMode', e.target.value as Service['pricingMode'])}>
            <option value="flat">Forfait ($/visite)</option>
            <option value="hourly">Horaire ($/h)</option>
          </Select>
        </Field>
        <Field label={form.pricingMode === 'hourly' ? 'Taux horaire ($)' : 'Prix forfaitaire ($)'}>
          <MoneyInput
            value={form.unitPrice}
            onChange={(v) => set('unitPrice', v)}
            className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-zinc-100 outline-none focus:border-neon-violet/50"
          />
        </Field>
        <Field label="Durée estimée (minutes)">
          <Input
            type="number"
            value={form.durationMin}
            onChange={(e) => set('durationMin', Number(e.target.value))}
          />
        </Field>
        <Field label="Description" className="sm:col-span-2">
          <Textarea value={form.description ?? ''} onChange={(e) => set('description', e.target.value)} />
        </Field>
        <label className="flex items-center gap-2 text-sm text-zinc-300 sm:col-span-2">
          <input
            type="checkbox"
            checked={form.active}
            onChange={(e) => set('active', e.target.checked)}
            className="h-4 w-4 accent-neon-violet"
          />
          Service actif (disponible à la vente)
        </label>
      </div>
    </Modal>
  );
}
