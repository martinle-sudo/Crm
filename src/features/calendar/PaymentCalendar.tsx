import { useMemo, useState } from 'react';
import {
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import { useDraggable, useDroppable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import {
  addDays,
  format,
  getDay,
  startOfMonth,
} from 'date-fns';
import { fr } from 'date-fns/locale';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowRightCircle,
  CalendarClock,
  RotateCcw,
} from 'lucide-react';
import { useStore, selectAppState } from '@/store/useStore';
import { toISO } from '@/domain/dates';
import { expandRule } from '@/domain/recurrence';
import { projectAt } from '@/domain/projection';
import { Money } from '@/ui/Money';
import { IconButton } from '@/ui/IconButton';
import { Pill } from '@/ui/Pill';
import { cn } from '@/ui/cn';
import type { ProjectedEvent } from '@/domain/types';

const WEEKDAYS = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];

interface DraggableEventProps {
  event: ProjectedEvent;
  isOver?: boolean;
}

function DraggableEvent({ event }: DraggableEventProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `${event.ruleId ?? event.txId}@${event.date}`,
    data: { event },
    // We only allow dragging rule occurrences (which have shift exceptions).
    disabled: event.source !== 'rule' || !event.ruleId,
  });

  const style = {
    transform: CSS.Translate.toString(transform),
    opacity: isDragging ? 0.7 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={cn(
        'flex items-center justify-between gap-1 rounded-md px-1.5 py-0.5 text-[10px] truncate',
        event.amount < 0
          ? 'bg-neon-coral/15 text-neon-coral hover:bg-neon-coral/25'
          : 'bg-neon-mint/15 text-neon-mint hover:bg-neon-mint/25',
        event.source === 'rule' && event.ruleId
          ? 'cursor-grab active:cursor-grabbing'
          : 'cursor-default',
        isDragging && 'shadow-glow-violet',
      )}
      title={event.label}
    >
      <span className="truncate">{event.label}</span>
      {event.shifted && <ArrowRightCircle className="h-2.5 w-2.5 shrink-0" />}
    </div>
  );
}

function DayCell({
  date,
  inMonth,
  events,
  onClearException,
  hasShiftedHere,
}: {
  date: Date;
  inMonth: boolean;
  events: ProjectedEvent[];
  onClearException: (event: ProjectedEvent) => void;
  hasShiftedHere: boolean;
}) {
  const iso = toISO(date);
  const { setNodeRef, isOver } = useDroppable({ id: iso });
  return (
    <div
      ref={setNodeRef}
      className={cn(
        'min-h-[88px] rounded-2xl ring-1 ring-inset transition-colors flex flex-col gap-1 p-1.5',
        inMonth
          ? 'bg-white/[0.025] ring-white/[0.06]'
          : 'bg-white/[0.01] ring-white/[0.03] opacity-60',
        isOver && 'bg-neon-violet/15 ring-neon-violet/40 shadow-glow-violet',
      )}
    >
      <div
        className={cn(
          'flex items-center justify-between text-[10px]',
          inMonth ? 'text-zinc-400' : 'text-zinc-600',
        )}
      >
        <span className="num-display font-semibold">{date.getDate()}</span>
        {hasShiftedHere && (
          <button
            onClick={() => events.filter(e => e.shifted).forEach(onClearException)}
            className="text-[9px] text-neon-amber hover:text-neon-amber/80 inline-flex items-center gap-0.5"
            title="Annuler les reports"
          >
            <RotateCcw className="h-2.5 w-2.5" />
          </button>
        )}
      </div>
      <div className="flex flex-col gap-1 overflow-hidden">
        {events.slice(0, 3).map((e, i) => (
          <DraggableEvent key={`${e.ruleId ?? e.txId}-${i}`} event={e} />
        ))}
        {events.length > 3 && (
          <span className="text-[9px] text-zinc-500 px-1">
            +{events.length - 3}
          </span>
        )}
      </div>
    </div>
  );
}

export function PaymentCalendar() {
  const [monthOffset, setMonthOffset] = useState(0);
  const state = useStore(selectAppState);
  const setRuleException = useStore((s) => s.setRuleException);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
  );

  const { monthStart, monthEnd, gridFrom, gridTo, days } = useMemo(() => {
    const now = new Date();
    const ms = startOfMonth(
      new Date(now.getFullYear(), now.getMonth() + monthOffset, 1),
    );
    const me = new Date(ms.getFullYear(), ms.getMonth() + 1, 0);
    const startDow = (getDay(ms) + 6) % 7;
    const gridStart = addDays(ms, -startDow);
    const totalCells = Math.ceil((startDow + me.getDate()) / 7) * 7;
    const gridEnd = addDays(gridStart, totalCells - 1);
    const out: Date[] = [];
    for (let i = 0; i < totalCells; i++) out.push(addDays(gridStart, i));
    return {
      monthStart: ms,
      monthEnd: me,
      gridFrom: gridStart,
      gridTo: gridEnd,
      days: out,
    };
  }, [monthOffset]);

  const eventsByDate = useMemo(() => {
    const fromIso = toISO(gridFrom);
    const toIso = toISO(gridTo);
    const map = new Map<string, ProjectedEvent[]>();
    for (const rule of Object.values(state.recurringRules)) {
      const expanded = expandRule(rule, fromIso, toIso);
      for (const e of expanded) {
        if (!map.has(e.date)) map.set(e.date, []);
        map.get(e.date)!.push(e);
      }
    }
    for (const tx of Object.values(state.transactions)) {
      if (tx.date < fromIso || tx.date > toIso) continue;
      if (!map.has(tx.date)) map.set(tx.date, []);
      map.get(tx.date)!.push({
        date: tx.date,
        label: tx.label,
        amount: tx.amount,
        source: 'transaction',
        txId: tx.id,
      });
    }
    return map;
  }, [state.recurringRules, state.transactions, gridFrom, gridTo]);

  const handleDragEnd = (e: DragEndEvent) => {
    const event = e.active.data.current?.event as ProjectedEvent | undefined;
    const newDate = e.over?.id as string | undefined;
    if (!event || !newDate || !event.ruleId) return;
    if (newDate === event.date) return;

    const rule = state.recurringRules[event.ruleId];
    if (!rule) return;

    // Find original date: if already shifted, the original key is the one
    // that maps to the current date in `exceptions`. Otherwise it's the date.
    let originalDate = event.date;
    if (event.shifted) {
      for (const [orig, exc] of Object.entries(rule.exceptions)) {
        if (exc.type === 'shift' && exc.newDate === event.date) {
          originalDate = orig;
          break;
        }
      }
    }
    setRuleException(rule.id, originalDate, {
      type: 'shift',
      newDate,
    });
  };

  const handleClearException = (event: ProjectedEvent) => {
    if (!event.ruleId || !event.shifted) return;
    const rule = state.recurringRules[event.ruleId];
    if (!rule) return;
    for (const [orig, exc] of Object.entries(rule.exceptions)) {
      if (exc.type === 'shift' && exc.newDate === event.date) {
        setRuleException(rule.id, orig, null);
        return;
      }
    }
  };

  const monthLabel = format(monthStart, 'MMMM yyyy', { locale: fr });

  // Quick stat: lowest balance day in this month
  const monthBalances = useMemo(() => {
    const balances: { date: string; balance: number }[] = [];
    let cursor = monthStart;
    while (cursor <= monthEnd) {
      const iso = toISO(cursor);
      balances.push({
        date: iso,
        balance: projectAt(
          { state, scenarios: Object.values(state.scenarios) },
          iso,
        ),
      });
      cursor = addDays(cursor, 1);
    }
    return balances;
  }, [state, monthStart, monthEnd]);

  const lowest = useMemo(
    () =>
      monthBalances.reduce(
        (acc, d) => (d.balance < acc.balance ? d : acc),
        monthBalances[0] ?? { date: '', balance: 0 },
      ),
    [monthBalances],
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <div className="text-[10px] uppercase tracking-[0.18em] text-zinc-500 font-medium flex items-center gap-2">
            <CalendarClock className="h-3 w-3" />
            <span>Calendrier manipulable</span>
          </div>
          <div className="num-display text-xl font-semibold capitalize mt-0.5">
            {monthLabel}
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Pill tone={lowest.balance < state.preferences.stressThresholds.warning ? 'coral' : 'mint'}>
            Plancher : <Money amount={lowest.balance} />
          </Pill>
          <div className="flex gap-1">
            <IconButton onClick={() => setMonthOffset((m) => m - 1)}>
              ‹
            </IconButton>
            <IconButton onClick={() => setMonthOffset(0)} title="Aujourd'hui">
              •
            </IconButton>
            <IconButton onClick={() => setMonthOffset((m) => m + 1)}>
              ›
            </IconButton>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-1.5 text-center text-[10px] uppercase tracking-[0.14em] text-zinc-600">
        {WEEKDAYS.map((d, i) => (
          <div key={i}>{d}</div>
        ))}
      </div>

      <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
        <div className="grid grid-cols-7 gap-1.5">
          <AnimatePresence>
            {days.map((d) => {
              const iso = toISO(d);
              const inMonth = d >= monthStart && d <= monthEnd;
              const cellEvents = eventsByDate.get(iso) ?? [];
              const hasShifted = cellEvents.some((e) => e.shifted);
              return (
                <motion.div
                  key={iso}
                  layout
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.2 }}
                >
                  <DayCell
                    date={d}
                    inMonth={inMonth}
                    events={cellEvents}
                    onClearException={handleClearException}
                    hasShiftedHere={hasShifted}
                  />
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      </DndContext>

      <p className="text-[11px] text-zinc-500">
        Glisse une facture vers une autre date pour simuler un report — la projection se met à jour en direct.
      </p>
    </div>
  );
}
