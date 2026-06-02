import { useState } from 'react';
import { Sparkles, LogIn, Loader2 } from 'lucide-react';
import { useStore } from '@/store/useStore';
import { Button } from '@/ui/Button';
import { Field, Input } from '@/ui/Field';

export function Login() {
  const login = useStore((s) => s.login);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await login(email.trim(), password);
    } catch (err) {
      setError((err as Error).message || 'Connexion impossible.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <form
        onSubmit={submit}
        className="w-full max-w-sm rounded-3xl border border-white/10 bg-ink-900/80 p-8 shadow-bento backdrop-blur-xl"
      >
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-neon-violet to-neon-cyan shadow-glow-violet">
            <Sparkles className="h-5 w-5 text-ink-950" strokeWidth={2.5} />
          </div>
          <div>
            <div className="font-display text-base font-semibold text-zinc-100">Solutions Plan B</div>
            <div className="text-[10px] uppercase tracking-[0.18em] text-zinc-500">CRM Entretien</div>
          </div>
        </div>

        <h1 className="mb-1 font-display text-lg font-semibold text-zinc-100">Connexion</h1>
        <p className="mb-6 text-xs text-zinc-500">Accédez à votre espace de gestion.</p>

        {error && (
          <div className="mb-4 rounded-xl bg-neon-coral/10 px-3 py-2 text-sm text-neon-coral ring-1 ring-inset ring-neon-coral/20">
            {error}
          </div>
        )}

        <div className="space-y-4">
          <Field label="Courriel">
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoFocus autoComplete="username" />
          </Field>
          <Field label="Mot de passe">
            <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required autoComplete="current-password" />
          </Field>
        </div>

        <Button type="submit" variant="primary" className="mt-6 w-full" disabled={busy}>
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogIn className="h-4 w-4" />}
          {busy ? 'Connexion…' : 'Se connecter'}
        </Button>
      </form>
    </div>
  );
}
