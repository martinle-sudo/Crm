import { useMemo, useState } from 'react';
import { Plus, Users, Mail, Phone, MapPin, Trash2, Pencil, FileText, ClipboardCheck } from 'lucide-react';
import { useStore } from '@/store/useStore';
import type { Client } from '@/domain/types';
import { Button } from '@/ui/Button';
import { Pill } from '@/ui/Pill';
import { Avatar } from '@/ui/Avatar';
import { Modal } from '@/ui/Modal';
import { Field, Input, Select, Textarea } from '@/ui/Field';
import { EmptyState } from '@/ui/EmptyState';
import { Toolbar, SearchInput, FilterTabs } from '@/ui/PageHeader';
import { Money } from '@/ui/Money';
import { clientType, clientStatus, frequency } from '@/domain/labels';
import { prettyDate } from '@/domain/dates';
import { invoiceTotal } from '@/app/selectors';

type Filter = 'all' | Client['status'];

const emptyClient: Omit<Client, 'id' | 'createdAt'> = {
  name: '', type: 'residential', status: 'prospect', contactName: '', email: '',
  phone: '', address: '', city: '', postalCode: '', tags: [], notes: '',
};

export function Clients() {
  const clients = useStore((s) => s.clients);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const [editing, setEditing] = useState<Client | 'new' | null>(null);
  const [detail, setDetail] = useState<string | null>(null);

  const list = useMemo(() => {
    const q = query.toLowerCase();
    return Object.values(clients)
      .filter((c) => filter === 'all' || c.status === filter)
      .filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          c.city?.toLowerCase().includes(q) ||
          c.email?.toLowerCase().includes(q),
      )
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [clients, query, filter]);

  return (
    <div>
      <Toolbar>
        <SearchInput value={query} onChange={setQuery} placeholder="Rechercher un client…" />
        <FilterTabs
          value={filter}
          onChange={setFilter}
          options={[
            { value: 'all', label: 'Tous' },
            { value: 'active', label: 'Actifs' },
            { value: 'prospect', label: 'Prospects' },
            { value: 'inactive', label: 'Inactifs' },
            { value: 'lost', label: 'Perdus' },
          ]}
        />
        <Button variant="primary" onClick={() => setEditing('new')}>
          <Plus className="h-4 w-4" /> Nouveau client
        </Button>
      </Toolbar>

      {list.length === 0 ? (
        <EmptyState
          icon={<Users className="h-5 w-5" />}
          title="Aucun client"
          description="Ajoutez votre premier client pour commencer."
          action={
            <Button variant="primary" onClick={() => setEditing('new')}>
              <Plus className="h-4 w-4" /> Nouveau client
            </Button>
          }
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {list.map((c) => (
            <div
              key={c.id}
              className="bento-card cursor-pointer p-4"
              onClick={() => setDetail(c.id)}
            >
              <div className="flex items-start gap-3">
                <Avatar name={c.name} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate font-medium text-zinc-100">{c.name}</p>
                  </div>
                  <div className="mt-1 flex flex-wrap gap-1.5">
                    <Pill tone={clientType[c.type].tone}>{clientType[c.type].label}</Pill>
                    <Pill tone={clientStatus[c.status].tone}>{clientStatus[c.status].label}</Pill>
                  </div>
                  <div className="mt-2 space-y-1 text-xs text-zinc-500">
                    {c.city && (
                      <p className="flex items-center gap-1.5">
                        <MapPin className="h-3 w-3" /> {c.city}
                      </p>
                    )}
                    {c.phone && (
                      <p className="flex items-center gap-1.5">
                        <Phone className="h-3 w-3" /> {c.phone}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {editing && (
        <ClientForm client={editing === 'new' ? null : editing} onClose={() => setEditing(null)} />
      )}
      {detail && (
        <ClientDetail
          clientId={detail}
          onClose={() => setDetail(null)}
          onEdit={() => {
            const c = clients[detail];
            setDetail(null);
            if (c) setEditing(c);
          }}
        />
      )}
    </div>
  );
}

function ClientForm({ client, onClose }: { client: Client | null; onClose: () => void }) {
  const upsert = useStore((s) => s.upsertClient);
  const [form, setForm] = useState<Omit<Client, 'id' | 'createdAt'>>(
    client ?? emptyClient,
  );
  const set = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const save = () => {
    if (!form.name.trim()) return;
    upsert({ ...form, id: client?.id });
    onClose();
  };

  return (
    <Modal
      open
      onClose={onClose}
      title={client ? 'Modifier le client' : 'Nouveau client'}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Annuler</Button>
          <Button variant="primary" onClick={save}>Enregistrer</Button>
        </>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Nom *" className="sm:col-span-2">
          <Input value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="Famille Tremblay / Boutique X inc." />
        </Field>
        <Field label="Type">
          <Select value={form.type} onChange={(e) => set('type', e.target.value as Client['type'])}>
            <option value="residential">Résidentiel</option>
            <option value="commercial">Commercial</option>
          </Select>
        </Field>
        <Field label="Statut">
          <Select value={form.status} onChange={(e) => set('status', e.target.value as Client['status'])}>
            <option value="prospect">Prospect</option>
            <option value="active">Actif</option>
            <option value="inactive">Inactif</option>
            <option value="lost">Perdu</option>
          </Select>
        </Field>
        <Field label="Personne-ressource">
          <Input value={form.contactName ?? ''} onChange={(e) => set('contactName', e.target.value)} />
        </Field>
        <Field label="Téléphone">
          <Input value={form.phone ?? ''} onChange={(e) => set('phone', e.target.value)} />
        </Field>
        <Field label="Courriel" className="sm:col-span-2">
          <Input type="email" value={form.email ?? ''} onChange={(e) => set('email', e.target.value)} />
        </Field>
        <Field label="Adresse" className="sm:col-span-2">
          <Input value={form.address ?? ''} onChange={(e) => set('address', e.target.value)} />
        </Field>
        <Field label="Ville">
          <Input value={form.city ?? ''} onChange={(e) => set('city', e.target.value)} />
        </Field>
        <Field label="Code postal">
          <Input value={form.postalCode ?? ''} onChange={(e) => set('postalCode', e.target.value)} />
        </Field>
        <Field label="Notes internes" className="sm:col-span-2">
          <Textarea value={form.notes ?? ''} onChange={(e) => set('notes', e.target.value)} />
        </Field>
      </div>
    </Modal>
  );
}

function ClientDetail({
  clientId,
  onClose,
  onEdit,
}: {
  clientId: string;
  onClose: () => void;
  onEdit: () => void;
}) {
  const client = useStore((s) => s.clients[clientId]);
  const contracts = useStore((s) => s.contracts);
  const interventions = useStore((s) => s.interventions);
  const invoices = useStore((s) => s.invoices);
  const removeClient = useStore((s) => s.removeClient);

  if (!client) return null;

  const cContracts = Object.values(contracts).filter((c) => c.clientId === clientId);
  const cInterventions = Object.values(interventions)
    .filter((i) => i.clientId === clientId)
    .sort((a, b) => (a.date < b.date ? 1 : -1));
  const cInvoices = Object.values(invoices).filter((i) => i.clientId === clientId);
  const totalBilled = cInvoices.reduce((sum, i) => sum + invoiceTotal(i), 0);

  return (
    <Modal
      open
      onClose={onClose}
      size="lg"
      title={
        <span className="flex items-center gap-3">
          <Avatar name={client.name} size="sm" /> {client.name}
        </span>
      }
      subtitle={`${clientType[client.type].label} · Client depuis le ${prettyDate(client.createdAt, { day: 'numeric', month: 'long', year: 'numeric' })}`}
      footer={
        <>
          <Button
            variant="ghost"
            onClick={() => {
              if (confirm(`Supprimer ${client.name} ? Cette action est irréversible.`)) {
                removeClient(clientId);
                onClose();
              }
            }}
          >
            <Trash2 className="h-4 w-4" /> Supprimer
          </Button>
          <Button variant="primary" onClick={onEdit}>
            <Pencil className="h-4 w-4" /> Modifier
          </Button>
        </>
      }
    >
      <div className="space-y-5">
        <div className="flex flex-wrap gap-2">
          <Pill tone={clientStatus[client.status].tone}>{clientStatus[client.status].label}</Pill>
          {client.tags.map((t) => (
            <Pill key={t}>{t}</Pill>
          ))}
        </div>

        <div className="grid gap-2 text-sm text-zinc-400 sm:grid-cols-2">
          {client.email && <p className="flex items-center gap-2"><Mail className="h-4 w-4 text-zinc-600" /> {client.email}</p>}
          {client.phone && <p className="flex items-center gap-2"><Phone className="h-4 w-4 text-zinc-600" /> {client.phone}</p>}
          {(client.address || client.city) && (
            <p className="flex items-center gap-2 sm:col-span-2">
              <MapPin className="h-4 w-4 text-zinc-600" />
              {[client.address, client.city, client.postalCode].filter(Boolean).join(', ')}
            </p>
          )}
        </div>

        {client.notes && (
          <div className="rounded-xl bg-white/[0.03] p-3 text-sm text-zinc-400">{client.notes}</div>
        )}

        <div className="grid grid-cols-3 gap-3">
          <Stat label="Contrats" value={String(cContracts.length)} />
          <Stat label="Interventions" value={String(cInterventions.length)} />
          <Stat label="Facturé (avec taxes)" value={<Money amount={totalBilled} />} />
        </div>

        {cContracts.length > 0 && (
          <Section icon={<FileText className="h-4 w-4" />} title="Contrats">
            {cContracts.map((c) => (
              <div key={c.id} className="flex items-center justify-between rounded-xl bg-white/[0.02] px-3 py-2 text-sm">
                <span className="text-zinc-300">{c.title}</span>
                <Pill tone={frequency[c.frequency].tone}>{frequency[c.frequency].label}</Pill>
              </div>
            ))}
          </Section>
        )}

        {cInterventions.length > 0 && (
          <Section icon={<ClipboardCheck className="h-4 w-4" />} title="Historique des interventions">
            {cInterventions.slice(0, 8).map((i) => (
              <div key={i.id} className="flex items-center justify-between rounded-xl bg-white/[0.02] px-3 py-2 text-sm">
                <span className="text-zinc-400">{prettyDate(i.date, { weekday: 'short', day: 'numeric', month: 'short' })} · {i.startTime}</span>
                <Money amount={i.amount} className="text-zinc-300" />
              </div>
            ))}
          </Section>
        )}
      </div>
    </Modal>
  );
}

function Stat({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-xl bg-white/[0.03] p-3">
      <p className="text-[10px] uppercase tracking-[0.14em] text-zinc-500">{label}</p>
      <p className="num-display mt-1 text-lg font-semibold text-zinc-100">{value}</p>
    </div>
  );
}

function Section({
  icon,
  title,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <p className="mb-2 flex items-center gap-2 text-[11px] uppercase tracking-[0.14em] text-zinc-500">
        {icon} {title}
      </p>
      <div className="space-y-1.5">{children}</div>
    </div>
  );
}
