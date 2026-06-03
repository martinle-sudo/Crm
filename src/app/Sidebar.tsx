import { Sparkles } from 'lucide-react';
import { NAV, type View, type NavItem } from './nav';
import { cn } from '@/ui/cn';

const GROUPS: NavItem['group'][] = ['Pilotage', 'Opérations', 'Ventes', 'Configuration', 'Administration'];

export function Sidebar({
  view,
  onNavigate,
  onClose,
  canAdmin,
}: {
  view: View;
  onNavigate: (v: View) => void;
  onClose?: () => void;
  canAdmin?: boolean;
}) {
  const visibleItems = NAV.filter((n) => !n.adminOnly || canAdmin);

  return (
    <nav className="flex h-full w-64 flex-col gap-6 overflow-y-auto scrollbar-hide bg-ink-900/60 px-4 py-6 backdrop-blur-xl">
      <div className="flex items-center gap-3 px-2">
        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-neon-violet to-neon-cyan shadow-glow-violet">
          <Sparkles className="h-5 w-5 text-ink-950" strokeWidth={2.5} />
        </div>
        <div>
          <div className="font-display text-sm font-semibold leading-tight text-zinc-100">
            Solutions Plan&nbsp;B
          </div>
          <div className="text-[10px] uppercase tracking-[0.18em] text-zinc-500">
            CRM Entretien
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-5">
        {GROUPS.map((group) => {
          const items = visibleItems.filter((n) => n.group === group);
          if (items.length === 0) return null;
          return (
            <div key={group} className="flex flex-col gap-1">
              <div className="px-3 pb-1 text-[10px] uppercase tracking-[0.18em] text-zinc-600">
                {group}
              </div>
              {items.map((item) => {
                const Icon = item.icon;
                const active = item.view === view;
                return (
                  <button
                    key={item.view}
                    onClick={() => {
                      onNavigate(item.view);
                      onClose?.();
                    }}
                    className={cn(
                      'flex items-center gap-3 rounded-xl px-3 py-2 text-sm transition-colors',
                      active
                        ? 'bg-neon-violet/15 text-neon-violet ring-1 ring-inset ring-neon-violet/25'
                        : 'text-zinc-400 hover:bg-white/5 hover:text-zinc-200',
                    )}
                  >
                    <Icon className="h-4 w-4 shrink-0" strokeWidth={2} />
                    {item.label}
                  </button>
                );
              })}
            </div>
          );
        })}
      </div>
    </nav>
  );
}
