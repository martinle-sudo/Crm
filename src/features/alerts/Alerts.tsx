import { useMemo } from 'react';
import { addDays, format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { AlertTriangle, ShieldCheck } from 'lucide-react';
import { motion } from 'framer-motion';
import { useStore } from '@/store/useStore';
import { useProjection } from '@/features/timeline/useProjection';
import { Money } from '@/ui/Money';
import { Pill } from '@/ui/Pill';
import { todayISO, toISO, fromISO } from '@/domain/dates';
import type { DayProjection } from '@/domain/types';

export function Alerts() {
  const prefs = useStore((s) => s.preferences);
  const today = todayISO();
  const series = useProjection({
    from: today,
    to: toISO(addDays(new Date(), 90)),
  });

  const criticalDays = useMemo(
    () =>
      series
        .filter(
          (d) => d.closingBalance < prefs.stressThresholds.critical,
        )
        .slice(0, 4),
    [series, prefs.stressThresholds.critical],
  );

  return (
    <div className="flex flex-col gap-4">
      <div>
        <div className="text-[10px] uppercase tracking-[0.18em] text-zinc-500 font-medium flex items-center gap-2">
          <AlertTriangle className="h-3 w-3" />
          Alertes
        </div>
        <div className="num-display text-xl font-semibold mt-0.5">
          {criticalDays.length === 0 ? (
            <span className="text-neon-mint">Tout va bien</span>
          ) : (
            <>
              <span className="text-neon-coral">{criticalDays.length}</span>
              <span className="text-zinc-500 text-sm font-normal ml-2">
                {criticalDays.length > 1 ? 'jours critiques' : 'jour critique'}
              </span>
            </>
          )}
        </div>
      </div>

      {criticalDays.length === 0 ? (
        <div className="rounded-2xl bg-neon-mint/5 ring-1 ring-inset ring-neon-mint/15 p-4 flex items-center gap-3">
          <ShieldCheck className="h-5 w-5 text-neon-mint shrink-0" />
          <div className="text-xs text-zinc-300">
            Ton solde reste au-dessus du seuil critique sur les 90 prochains jours.
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {criticalDays.map((d) => (
            <AlertItem key={d.date} day={d} />
          ))}
        </div>
      )}
    </div>
  );
}

function AlertItem({ day }: { day: DayProjection }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -6 }}
      animate={{ opacity: 1, x: 0 }}
      className="rounded-2xl bg-neon-coral/5 ring-1 ring-inset ring-neon-coral/20 p-3 flex items-center gap-3"
    >
      <div className="h-9 w-9 rounded-xl bg-neon-coral/15 ring-1 ring-inset ring-neon-coral/30 flex items-center justify-center">
        <AlertTriangle className="h-4 w-4 text-neon-coral" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm text-zinc-100 capitalize">
          {format(fromISO(day.date), 'EEEE d MMMM', { locale: fr })}
        </div>
        <div className="text-[10px] text-zinc-500">
          {day.events.length > 0
            ? day.events
                .slice(0, 2)
                .map((e) => e.label)
                .join(' · ')
            : 'sans mouvement'}
        </div>
      </div>
      <div className="text-right">
        <Money
          amount={day.closingBalance}
          className="num-display text-neon-coral"
        />
        <div className="mt-1">
          <Pill tone="coral">solde bas</Pill>
        </div>
      </div>
    </motion.div>
  );
}
