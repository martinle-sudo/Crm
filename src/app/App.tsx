import { useEffect, useState } from 'react';
import { Eye, EyeOff, RefreshCw, Menu, X, Download, LogOut, AlertTriangle } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { useStore } from '@/store/useStore';
import { isApiMode } from '@/store/backend';
import { IconButton } from '@/ui/IconButton';
import { Sidebar } from './Sidebar';
import { Login } from '@/features/auth/Login';
import { VIEW_TITLES, type View } from './nav';
import { longDate } from '@/domain/dates';
import { todayISO } from '@/domain/dates';

import { Dashboard } from '@/features/dashboard/Dashboard';
import { Clients } from '@/features/clients/Clients';
import { Contracts } from '@/features/contracts/Contracts';
import { Services } from '@/features/services/Services';
import { Planning } from '@/features/planning/Planning';
import { Employees } from '@/features/employees/Employees';
import { Interventions } from '@/features/interventions/Interventions';
import { Invoices } from '@/features/invoices/Invoices';
import { Quotes } from '@/features/quotes/Quotes';
import { Leads } from '@/features/leads/Leads';
import { Reports } from '@/features/reports/Reports';
import { Settings } from '@/features/settings/Settings';
import { AdminUsers } from '@/features/admin/Users';

export function App() {
  const hydrated = useStore((s) => s.hydrated);
  const hydrate = useStore((s) => s.hydrate);
  const reset = useStore((s) => s.reset);
  const blur = useStore((s) => s.preferences.privacy.blurAmounts);
  const toggleBlur = useStore((s) => s.toggleBlur);
  const auth = useStore((s) => s.auth);
  const authUser = useStore((s) => s.authUser);
  const logout = useStore((s) => s.logout);
  const syncError = useStore((s) => s.syncError);

  const [view, setView] = useState<View>('dashboard');
  const [mobileNav, setMobileNav] = useState(false);

  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  if (!hydrated || auth === 'loading') {
    return (
      <div className="flex min-h-screen items-center justify-center text-zinc-500">
        Chargement…
      </div>
    );
  }

  if (auth === 'anon') {
    return <Login />;
  }

  const exportData = () => {
    const state = useStore.getState() as unknown as Record<string, unknown>;
    const rest: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(state)) {
      if (typeof v !== 'function' && k !== 'hydrated') rest[k] = v;
    }
    const blob = new Blob([JSON.stringify(rest, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `solutions-plan-b-crm-${todayISO()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex min-h-screen">
      {/* Sidebar desktop */}
      <aside className="sticky top-0 hidden h-screen shrink-0 border-r border-white/5 lg:block">
        <Sidebar view={view} onNavigate={setView} canAdmin={authUser?.role === 'admin'} />
      </aside>

      {/* Sidebar mobile */}
      <AnimatePresence>
        {mobileNav && (
          <motion.div
            className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setMobileNav(false)}
          >
            <motion.aside
              className="h-full border-r border-white/5"
              initial={{ x: -280 }}
              animate={{ x: 0 }}
              exit={{ x: -280 }}
              transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
              onClick={(e) => e.stopPropagation()}
            >
              <Sidebar view={view} onNavigate={setView} onClose={() => setMobileNav(false)} canAdmin={authUser?.role === 'admin'} />
            </motion.aside>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex items-center justify-between gap-4 border-b border-white/5 bg-ink-950/70 px-5 py-4 backdrop-blur-xl md:px-8">
          <div className="flex items-center gap-3">
            <IconButton className="lg:hidden" onClick={() => setMobileNav(true)} title="Menu">
              <Menu className="h-4 w-4" />
            </IconButton>
            <div>
              <h1 className="font-display text-lg font-semibold tracking-tight text-zinc-100">
                {VIEW_TITLES[view]}
              </h1>
              <p className="text-[10px] uppercase tracking-[0.18em] text-zinc-500 first-letter:capitalize">
                {longDate(todayISO())}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <IconButton onClick={toggleBlur} title={blur ? 'Afficher les montants' : 'Masquer les montants'}>
              {blur ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </IconButton>
            <IconButton onClick={exportData} title="Exporter les données (JSON)" tone="mint">
              <Download className="h-4 w-4" />
            </IconButton>
            <IconButton
              onClick={() => {
                if (confirm('Réinitialiser toutes les données avec le jeu de démonstration ?')) {
                  void reset();
                }
              }}
              title="Réinitialiser (données démo)"
            >
              <RefreshCw className="h-4 w-4" />
            </IconButton>
            {isApiMode() && (
              <IconButton
                onClick={() => { if (confirm('Se déconnecter ?')) void logout(); }}
                title={authUser ? `Déconnexion (${authUser.name})` : 'Déconnexion'}
                tone="coral"
              >
                <LogOut className="h-4 w-4" />
              </IconButton>
            )}
          </div>
        </header>

        {syncError && (
          <div className="flex items-center gap-2 border-b border-neon-coral/20 bg-neon-coral/10 px-5 py-2 text-xs text-neon-coral md:px-8">
            <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
            Synchronisation serveur interrompue : {syncError}. Vos changements récents pourraient ne pas être sauvegardés.
          </div>
        )}

        <main className="mx-auto w-full max-w-[1500px] flex-1 px-5 py-6 md:px-8">
          <ViewRouter view={view} onNavigate={setView} />
        </main>
      </div>

      {/* Bouton fermeture nav mobile flottant (a11y fallback) */}
      {mobileNav && (
        <button
          className="fixed right-4 top-4 z-50 rounded-xl bg-white/10 p-2 lg:hidden"
          onClick={() => setMobileNav(false)}
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}

function ViewRouter({ view, onNavigate }: { view: View; onNavigate: (v: View) => void }) {
  switch (view) {
    case 'dashboard':
      return <Dashboard onNavigate={onNavigate} />;
    case 'clients':
      return <Clients />;
    case 'contracts':
      return <Contracts />;
    case 'services':
      return <Services />;
    case 'planning':
      return <Planning />;
    case 'employees':
      return <Employees />;
    case 'interventions':
      return <Interventions />;
    case 'invoices':
      return <Invoices />;
    case 'quotes':
      return <Quotes />;
    case 'leads':
      return <Leads />;
    case 'reports':
      return <Reports />;
    case 'settings':
      return <Settings />;
    case 'admin':
      return <AdminUsers />;
    default:
      return null;
  }
}
