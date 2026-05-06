import { useMemo, useState } from 'react';
import { addDays, format, getDay, startOfMonth } from 'date-fns';
import { fr } from 'date-fns/locale';
import { motion } from 'framer-motion';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useProjection } from '@/features/timeline/useProjection';
import { fromISO, toISO } from '@/domain/dates';
import { Money } from '@/ui/Money';
import { IconButton } from '@/ui/IconButton';
import { cn } from '@/ui/cn';
import type { StressLevel } from '@/domain/types';

const stressClass: Record<StressLevel, string> = {
  critical:
    'bg-neon-coral/30 ring-neon-coral/40 text-neon-coral hover:bg-neon-coral/45 shadow-glow-coral',
  warning:
    'bg-neon-amber/20 ring-neon-amber/30 text-neon-amber hover:bg-neon-amber/35',
  okay: 'bg-white/[0.04] ring-white/[0.06] text-zinc-300 hover:bg-white/[0.08]',
  comfortable:
    'bg-neon-mint/20 ring-neon-mint/25 text-neon-mint hover:bg-neon-mint/30',
};

const WEEKDAYS = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];

export function Heatmap() {
  const [monthOffset, setMonthOffset] = useState(0);

  const { monthStart, monthEnd, gridFrom, gridTo } = useMemo(() => {
    const now = new Date();
    const ms = startOfMonth(
      new Date(now.getFullYear(), now.getMonth() + monthOffset, 1),
    );
    const me = new Date(ms.getFullYear(), ms.getMonth() + 1, 0);
    const startDow = (getDay(ms) + 6) % 7;
    const gridStart = addDays(ms, -startDow);
    const totalCells = Math.ceil((startDow + me.getDate()) / 7) * 7;
    const gridEnd = addDays(gridStart, totalCells - 1);
    return {
      monthStart: ms,
      monthEnd: me,
      gridFrom: gridStart,
      gridTo: gridEnd,
    };
  }, [monthOffset]);

  const series = useProjection({
    from: toISO(gridFrom),
    to: toISO(gridTo),
  });

  const byDate = useMemo(
    () => new Map(series.map((d) => [d.date, d])),
    [series],
  );

  const monthLabel = format(monthStart, 'MMMM yyyy', { locale: fr });

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-[10px] uppercase tracking-[0.18em] text-zinc-500 font-medium">
            Stress financier
          </div>
          <div className="num-display text-xl font-semibold capitalize mt-0.5">
            {monthLabel}
          </div>
        </div>
        <div className="flex gap-1">
          <IconButton onClick={() => setMonthOffset((m) => m - 1)}>
            <ChevronLeft className="h-4 w-4" />
          </IconButton>
          <IconButton onClick={() => setMonthOffset((m) => m + 1)}>
            <ChevronRight className="h-4 w-4" />
          </IconButton>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-1.5 text-center text-[10px] uppercase tracking-[0.14em] text-zinc-600">
        {WEEKDAYS.map((d, i) => (
          <div key={i}>{d}</div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1.5">
        {series.map((day, i) => {
          const date = fromISO(day.date);
          const inMonth = date >= monthStart && date <= monthEnd;
          const cell = byDate.get(day.date)!;
          return (
            <motion.div
              key={day.date}
              initial={{ opacity: 0, scale: 0.92 }}
              animate={{ opacity: inMonth ? 1 : 0.25, scale: 1 }}
              transition={{ duration: 0.28, delay: Math.min(0.005 * i, 0.15) }}
              className={cn(
                'group relative aspect-square rounded-xl ring-1 ring-inset transition-all cursor-default flex flex-col items-center justify-center',
                stressClass[cell.stress],
              )}
              title={`${format(date, 'd MMM', { locale: fr })} — solde projeté`}
            >
              <span className="num-display text-sm font-semibold">
                {date.getDate()}
              </span>
              {cell.events.length > 0 && (
                <span className="absolute bottom-1 h-0.5 w-1.5 rounded-full bg-current opacity-70" />
              )}
              <div className="pointer-events-none absolute z-30 -top-1 left-1/2 -translate-x-1/2 -translate-y-full opacity-0 group-hover:opacity-100 transition-opacity duration-150 rounded-xl bg-ink-850/95 backdrop-blur ring-1 ring-white/10 px-2.5 py-1.5 text-xs whitespace-nowrap">
                <div className="text-zinc-400 capitalize">
                  {format(date, 'EEEE d MMM', { locale: fr })}
                </div>
                <div className="num-display text-zinc-100 mt-0.5">
                  <Money amount={cell.closingBalance} />
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      <div className="flex items-center gap-3 text-[10px] uppercase tracking-[0.14em] text-zinc-500">
        <LegendDot tone="critical" label="Critique" />
        <LegendDot tone="warning" label="Vigilance" />
        <LegendDot tone="okay" label="Stable" />
        <LegendDot tone="comfortable" label="Confort" />
      </div>
    </div>
  );
}

function LegendDot({ tone, label }: { tone: StressLevel; label: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className={cn('h-2.5 w-2.5 rounded-full ring-1 ring-inset', stressClass[tone])} />
      <span>{label}</span>
    </div>
  );
}
