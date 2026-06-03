import { useEffect, useState } from 'react';
import { Plus, ShieldCheck, Pencil, UserX, UserCheck, Loader2, KeyRound } from 'lucide-react';
import { useStore } from '@/store/useStore';
import { isApiMode, apiUsersList, apiUsersUpsert, apiUsersToggle } from '@/store/backend/api';
import type { CrmUser } from '@/store/backend/types';
import { Button } from '@/ui/Button';
import { Modal } from '@/ui/Modal';
import { Field, Input, Select } from '@/ui/Field';
import { Pill } from '@/ui/Pill';
import { EmptyState } from '@/ui/EmptyState';

const ROLES: { value: string; label: string }[] = [
  { value: 'admin',    label: 'Administrateur' },
  { value: 'manager',  label: 'Gestionnaire' },
  { value: 'employee', label: 'Employé' },
];

const roleTone: Record<string, 'violet' | 'cyan' | 'mint'> = {
  admin: 'violet',
  manager: 'cyan',
  employee: 'mint',
};

export function AdminUsers() {
  const authUser = useStore((s) => s.authUser);
  const [users, setUsers]     = useState<CrmUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);
  const [editing, setEditing] = useState<CrmUser | 'new' | null>(null);

  const load = async () => {
    try {
      setLoading(true);
      setError(null);
      const list = await apiUsersList();
      setUsers(list);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, []);

  const toggle = async (user: CrmUser) => {
    const action = user.active ? 'désactiver' : 'réactiver';
    if (!confirm(`${action.charAt(0).toUpperCase() + action.slice(1)} le compte de ${user.name} ?`)) return;
    try {
      await apiUsersToggle(user.id, !user.active);
      await load();
    } catch (e) {
      alert((e as Error).message);
    }
  };

  if (!isApiMode()) {
    return (
      <EmptyState
        icon={<ShieldCheck className="h-5 w-5" />}
        title="Mode serveur requis"
        description="La gestion des utilisateurs n'est disponible qu'en mode serveur (config.js : apiBase = 'api')."
      />
    );
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <p className="text-xs text-zinc-500">
            {users.length} utilisateur{users.length !== 1 ? 's' : ''}
          </p>
        </div>
        <Button variant="primary" onClick={() => setEditing('new')}>
          <Plus className="h-4 w-4" /> Nouvel utilisateur
        </Button>
      </div>

      {loading && (
        <div className="flex items-center gap-2 text-sm text-zinc-500">
          <Loader2 className="h-4 w-4 animate-spin" /> Chargement…
        </div>
      )}

      {error && (
        <div className="rounded-xl bg-neon-coral/10 px-4 py-3 text-sm text-neon-coral ring-1 ring-inset ring-neon-coral/20">
          {error}
        </div>
      )}

      {!loading && !error && users.length === 0 && (
        <EmptyState icon={<ShieldCheck className="h-5 w-5" />} title="Aucun utilisateur" />
      )}

      {!loading && users.length > 0 && (
        <div className="overflow-hidden rounded-2xl border border-white/5">
          <table className="w-full text-sm">
            <thead className="bg-white/[0.03] text-[10px] uppercase tracking-wide text-zinc-500">
              <tr>
                <th className="px-4 py-2.5 text-left">Nom</th>
                <th className="hidden px-4 py-2.5 text-left sm:table-cell">Courriel</th>
                <th className="px-4 py-2.5 text-left">Rôle</th>
                <th className="px-4 py-2.5 text-left">Statut</th>
                <th className="px-4 py-2.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className="border-t border-white/5">
                  <td className="px-4 py-3 font-medium text-zinc-200">
                    {u.name}
                    {u.id === authUser?.id && (
                      <span className="ml-2 text-[10px] text-zinc-600">(vous)</span>
                    )}
                  </td>
                  <td className="hidden px-4 py-3 text-zinc-400 sm:table-cell">{u.email}</td>
                  <td className="px-4 py-3">
                    <Pill tone={roleTone[u.role] ?? 'mint'}>
                      {ROLES.find((r) => r.value === u.role)?.label ?? u.role}
                    </Pill>
                  </td>
                  <td className="px-4 py-3">
                    <Pill tone={u.active ? 'mint' : 'coral'}>{u.active ? 'Actif' : 'Inactif'}</Pill>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <Button size="sm" variant="ghost" onClick={() => setEditing(u)} title="Modifier">
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => void toggle(u)}
                        disabled={u.id === authUser?.id}
                        title={u.active ? 'Désactiver' : 'Réactiver'}
                      >
                        {u.active
                          ? <UserX className="h-3.5 w-3.5 text-neon-coral" />
                          : <UserCheck className="h-3.5 w-3.5 text-neon-mint" />}
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {editing && (
        <UserForm
          user={editing === 'new' ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={() => { setEditing(null); void load(); }}
        />
      )}
    </div>
  );
}

function UserForm({
  user,
  onClose,
  onSaved,
}: {
  user: CrmUser | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [name, setName]         = useState(user?.name ?? '');
  const [email, setEmail]       = useState(user?.email ?? '');
  const [role, setRole]         = useState(user?.role ?? 'employee');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm]   = useState('');
  const [busy, setBusy]         = useState(false);
  const [error, setError]       = useState<string | null>(null);

  const submit = async () => {
    setError(null);
    if (!name.trim() || !email.trim()) {
      setError('Nom et courriel requis.');
      return;
    }
    if (!user && password.length < 8) {
      setError('Mot de passe d\'au moins 8 caractères requis.');
      return;
    }
    if (password && password !== confirm) {
      setError('Les mots de passe ne correspondent pas.');
      return;
    }
    setBusy(true);
    try {
      await apiUsersUpsert({
        id: user?.id,
        name: name.trim(),
        email: email.trim(),
        role,
        password: password || undefined,
      });
      onSaved();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      open
      onClose={onClose}
      size="md"
      title={user ? `Modifier — ${user.name}` : 'Nouvel utilisateur'}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Annuler</Button>
          <Button variant="primary" onClick={() => void submit()} disabled={busy}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {user ? 'Enregistrer' : 'Créer'}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        {error && (
          <div className="rounded-xl bg-neon-coral/10 px-3 py-2 text-sm text-neon-coral ring-1 ring-inset ring-neon-coral/20">
            {error}
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Nom complet *">
            <Input value={name} onChange={(e) => setName(e.target.value)} autoFocus />
          </Field>
          <Field label="Courriel *">
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </Field>
        </div>

        <Field label="Rôle">
          <Select value={role} onChange={(e) => setRole(e.target.value)}>
            {ROLES.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
          </Select>
        </Field>

        <div className="rounded-xl border border-white/5 p-4">
          <div className="mb-3 flex items-center gap-2 text-xs text-zinc-500">
            <KeyRound className="h-3.5 w-3.5" />
            {user ? 'Nouveau mot de passe (laisser vide pour ne pas modifier)' : 'Mot de passe *'}
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={user ? 'Nouveau mot de passe' : 'Mot de passe *'}>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="8 caractères min."
                autoComplete="new-password"
              />
            </Field>
            <Field label="Confirmer">
              <Input
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                autoComplete="new-password"
              />
            </Field>
          </div>
        </div>
      </div>
    </Modal>
  );
}
