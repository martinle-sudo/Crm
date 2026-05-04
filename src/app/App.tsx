import { useEffect } from 'react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Eye, EyeOff, RefreshCw, Sparkles } from 'lucide-react';
import { useStore } from '@/store/useStore';
import { Dashboard } from './Dashboard';
import { IconButton } from '@/ui/IconButton';

export function App() {
  const hydrated = useStore((s) => s.hydrated);
  const hydrate = useStore((s) => s.hydrate);
  const reset = useStore((s) => s.reset);
  const blur = useStore((s) => s.preferences.privacy.blurAmounts);

  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  if (!hydrated) {
    return (
      <div className="min-h-screen flex items-center justify-center text-zinc-500">
        Chargement…
      </div>
    );
  }

  const today = format(new Date(), 'EEEE d MMMM', { locale: fr });

  return (
    <div className="min-h-screen">
      <header className="px-5 md:px-8 pt-6 pb-4 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-2xl bg-gradient-to-br from-neon-violet to-neon-cyan flex items-center justify-center shadow-glow-violet">
            <Sparkles className="h-4 w-4 text-ink-950" strokeWidth={2.5} />
          </div>
          <div>
            <div className="font-display text-base font-semibold tracking-tight">
              Cashflow
            </div>
            <div className="text-[10px] uppercase tracking-[0.18em] text-zinc-500 capitalize">
              {today}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <IconButton
            onClick={() =>
              useStore.setState((s) => ({
                preferences: {
                  ...s.preferences,
                  privacy: {
                    ...s.preferences.privacy,
                    blurAmounts: !s.preferences.privacy.blurAmounts,
                  },
                },
              }))
            }
            title={blur ? 'Afficher les montants' : 'Masquer les montants'}
          >
            {blur ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </IconButton>
          <IconButton
            onClick={() => {
              if (confirm('Réinitialiser les données aux valeurs de démonstration ?')) {
                void reset();
              }
            }}
            title="Réinitialiser"
          >
            <RefreshCw className="h-4 w-4" />
          </IconButton>
        </div>
      </header>

      <main className="px-5 md:px-8 pb-12 max-w-[1600px] mx-auto">
        <Dashboard />
      </main>
    </div>
  );
}
