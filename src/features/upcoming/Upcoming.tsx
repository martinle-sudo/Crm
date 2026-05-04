import { useMemo } from 'react';
import { addDays, format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { motion } from 'framer-motion';
import { CalendarRange } from 'lucide-react';
import { useProjection } from '@/features/timeline/useProjection';
import { Money } from '@/ui/Money';
import { Pill } from '@/ui/Pill';
import { todayISO, toISO, fromISO } from '@/domain/dates';

export function Upcoming() {
  const today = todayISO();
  const series = useProjection({
    from: today,
    to: toISO(addDays(new Date(), 30)),
  });

  const events = useMemo(() => {
    const all = series.flatMap((d) => d.events);
    return all.slice(0, 8);
  }, [series]);

  return (
    <div className="flex flex-col gap-4">
      <div>
        <div className="text-[10px] uppercase tracking-[0.18em] text-zinc-500 font-medium flex items-center gap-2">
          <CalendarRange className="h-3 w-3" />
          Prochains mouvements
        </div>
        <div className="num-display text-xl font-semibold mt-0.5">
          30 prochains jours
        </div>
      </div>

      <div className="flex flex-col gap-1">
        {events.length === 0 && (
          <div className="text-xs text-zinc-500 py-6 text-center">
            Aucun mouvement prévu.
          </div>
        )}
        {events.map((e, i) => (
          <motion.div
            key={`${e.date}-${e.label}-${i}`}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.28, delay: i * 0.03 }}
            className="flex items-center gap-3 py-1.5"
          >
            <div className="w-12 shrink-0 text-center rounded-lg bg-white/[0.03] py-1">
              <div className="text-[10px] text-zinc-500 uppercase">
                {format(fromISO(e.date), 'MMM', { locale: fr })}
              </div>
              <div className="num-display text-sm font-semibold text-zinc-200 -mt-0.5">
                {format(fromISO(e.date), 'd')}
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm text-zinc-200 truncate flex items-center gap-2">
                {e.label}
                {e.shifted && <Pill tone="amber">reporté</Pill>}
                {e.source === 'scenario' && <Pill tone="violet">simulé</Pill>}
              </div>
              <div className="text-[10px] text-zinc-500 capitalize">
                {format(fromISO(e.date), 'EEEE', { locale: fr })}
              </div>
            </div>
            <div className="num-display text-sm">
              <Money amount={e.amount} signDisplay="always" colorize />
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
