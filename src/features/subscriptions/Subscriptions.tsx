import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Repeat, Trash2, AlertCircle } from 'lucide-react';
import { useStore } from '@/store/useStore';
import { Money } from '@/ui/Money';
import { Pill } from '@/ui/Pill';
import { IconButton } from '@/ui/IconButton';
import { describeRule, nextOccurrences } from '@/domain/recurrence';
import { todayISO, fromISO } from '@/domain/dates';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

export function Subscriptions() {
  const rules = useStore((s) => s.recurringRules);
  const remove = useStore((s) => s.removeRecurring);

  const subs = useMemo(
    () =>
      Object.values(rules)
        .filter((r) => r.kind === 'subscription')
        .sort((a, b) => Math.abs(b.amount) - Math.abs(a.amount)),
    [rules],
  );

  const monthlyTotal = useMemo(
    () => subs.reduce((sum, r) => sum + monthlyEquivalent(r.rrule, r.amount), 0),
    [subs],
  );
  const yearlyTotal = monthlyTotal * 12;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-[10px] uppercase tracking-[0.18em] text-zinc-500 font-medium flex items-center gap-2">
            <Repeat className="h-3 w-3" />
            Abonnements
          </div>
          <div className="num-display text-xl font-semibold mt-0.5">
            <Money amount={monthlyTotal} className="text-neon-coral" />
            <span className="text-sm text-zinc-500 ml-2 font-normal">/ mois</span>
          </div>
          <div className="text-xs text-zinc-500 mt-0.5">
            soit <Money amount={yearlyTotal} compact /> sur 1 an
          </div>
        </div>
        {Math.abs(monthlyTotal) > 100 && (
          <Pill tone="amber">
            <AlertCircle className="h-3 w-3" />
            Fuite détectée
          </Pill>
        )}
      </div>

      <div className="flex flex-col gap-1.5 max-h-[280px] overflow-y-auto scrollbar-hide">
        {subs.length === 0 && (
          <div className="text-xs text-zinc-500 text-center py-6">
            Aucun abonnement enregistré.
          </div>
        )}
        {subs.map((sub) => {
          const next = nextOccurrences(sub, todayISO(), 1)[0];
          return (
            <motion.div
              key={sub.id}
              layout
              initial={{ opacity: 0, x: -6 }}
              animate={{ opacity: 1, x: 0 }}
              className="group flex items-center gap-3 rounded-xl px-3 py-2 hover:bg-white/[0.04] transition-colors"
            >
              <div className="h-7 w-7 rounded-lg bg-white/5 flex items-center justify-center text-[10px] font-bold text-zinc-300">
                {(sub.subscription?.vendor ?? sub.label).slice(0, 1).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm text-zinc-200 truncate">
                  {sub.label}
                </div>
                <div className="text-[10px] text-zinc-500 capitalize">
                  {describeRule(sub.rrule)}
                  {next && (
                    <>
                      {' · '}prochain{' '}
                      {format(fromISO(next), 'd MMM', { locale: fr })}
                    </>
                  )}
                </div>
              </div>
              <div className="num-display text-sm text-neon-coral">
                <Money amount={sub.amount} />
              </div>
              <IconButton
                tone="coral"
                onClick={() => remove(sub.id)}
                className="opacity-0 group-hover:opacity-100"
              >
                <Trash2 className="h-3 w-3" />
              </IconButton>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

// Approximate monthly equivalent of a rule given its frequency.
// Good enough for a "leak detector" overview; not used for projection.
function monthlyEquivalent(rrule: string, amount: number): number {
  const lower = rrule.toUpperCase();
  if (lower.includes('FREQ=WEEKLY')) {
    const interval = parseInt(/INTERVAL=(\d+)/.exec(lower)?.[1] ?? '1', 10);
    return (amount * 4.345) / interval;
  }
  if (lower.includes('FREQ=DAILY')) return amount * 30;
  if (lower.includes('FREQ=YEARLY')) return amount / 12;
  return amount; // monthly default
}
