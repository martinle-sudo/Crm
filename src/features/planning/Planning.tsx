import { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, CalendarDays } from 'lucide-react';
import { useStore } from '@/store/useStore';
import { Button } from '@/ui/Button';
import { Pill } from '@/ui/Pill';
import { Toolbar, FilterTabs } from '@/ui/PageHeader';
import {
  startOfMonth, endOfMonth, startOfWeek, addDays, toISO, isSameDay, fromISO, format, fr,
} from '@/domain/dates';
import { interventionStatus, weekdays } from '@/domain/labels';
import { todayISO } from '@/domain/dates';
import { cn } from '@/ui/cn';

export function Planning() {
  const interventions = useStore((s) => s.interventions);
  const clients = useStore((s) => s.clients);
  const employees = useStore((s) => s.employees);
  const [cursor, setCursor] = useState(() => startOfMonth(new Date()));
  const [empFilter, setEmpFilter] = useState<string>('all');
  const [selectedDay, setSelectedDay] = useState<string | null>(todayISO());

  const days = useMemo(() => {
    const first = startOfWeek(startOfMonth(cursor), { weekStartsOn: 0 });
    const last = endOfMonth(cursor);
    const cells: Date[] = [];
    let d = first;
    while (d <= last || cells.length % 7 !== 0) {
      cells.push(d);
      d = addDays(d, 1);
    }
    return cells;
  }, [cursor]);

  const byDate = useMemo(() => {
    const map: Record<string, typeof interventions[string][]> = {};
    Object.values(interventions)
      .filter((i) => empFilter === 'all' || i.assignedEmployeeIds.includes(empFilter))
      .forEach((i) => {
        (map[i.date] ??= []).push(i);
      });
    Object.values(map).forEach((arr) => arr.sort((a, b) => a.startTime.localeCompare(b.startTime)));
    return map;
  }, [interventions, empFilter]);

  const dayList = selectedDay ? (byDate[selectedDay] ?? []) : [];

  return (
    <div>
      <Toolbar>
        <div className="flex items-center gap-2">
          <Button variant="soft" size="sm" onClick={() => setCursor(addDays(startOfMonth(cursor), -1))}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="min-w-[160px] text-center font-display text-sm font-semibold capitalize text-zinc-200">
            {format(cursor, 'MMMM yyyy', { locale: fr })}
          </span>
          <Button variant="soft" size="sm" onClick={() => setCursor(startOfMonth(addDays(endOfMonth(cursor), 1)))}>
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={() => { setCursor(startOfMonth(new Date())); setSelectedDay(todayISO()); }}>
            Aujourd’hui
          </Button>
        </div>
        <div className="flex-1" />
        <FilterTabs
          value={empFilter}
          onChange={setEmpFilter}
          options={[
            { value: 'all', label: 'Toute l’équipe' },
            ...Object.values(employees).map((e) => ({ value: e.id, label: e.firstName })),
          ]}
        />
      </Toolbar>

      <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
        <div className="bento-card p-3">
          <div className="mb-2 grid grid-cols-7 gap-1">
            {weekdays.map((d) => (
              <div key={d} className="py-1 text-center text-[10px] uppercase tracking-wide text-zinc-600">{d}</div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {days.map((d) => {
              const iso = toISO(d);
              const items = byDate[iso] ?? [];
              const inMonth = d.getMonth() === cursor.getMonth();
              const isToday = isSameDay(d, new Date());
              const selected = selectedDay === iso;
              return (
                <button
                  key={iso}
                  onClick={() => setSelectedDay(iso)}
                  className={cn(
                    'flex min-h-[76px] flex-col gap-1 rounded-xl border p-1.5 text-left transition-colors',
                    inMonth ? 'border-white/5 bg-white/[0.02]' : 'border-transparent bg-transparent opacity-40',
                    selected && 'border-neon-violet/40 bg-neon-violet/10',
                  )}
                >
                  <span className={cn('text-xs', isToday ? 'flex h-5 w-5 items-center justify-center rounded-full bg-neon-violet text-ink-950 font-semibold' : 'text-zinc-500')}>
                    {d.getDate()}
                  </span>
                  <div className="flex flex-col gap-0.5">
                    {items.slice(0, 3).map((i) => (
                      <span key={i.id} className={cn('truncate rounded px-1 py-0.5 text-[9px]', toneBg(i.status))}>
                        {i.startTime} {clients[i.clientId]?.name ?? ''}
                      </span>
                    ))}
                    {items.length > 3 && <span className="px-1 text-[9px] text-zinc-500">+{items.length - 3}</span>}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <div className="bento-card p-4">
          <p className="flex items-center gap-2 text-sm font-medium text-zinc-200">
            <CalendarDays className="h-4 w-4 text-neon-violet" />
            {selectedDay ? format(fromISO(selectedDay), 'EEEE d MMMM', { locale: fr }) : 'Sélectionnez un jour'}
          </p>
          <div className="mt-3 space-y-2">
            {dayList.length === 0 ? (
              <p className="py-8 text-center text-xs text-zinc-600">Aucune intervention ce jour-là.</p>
            ) : (
              dayList.map((i) => (
                <div key={i.id} className="rounded-xl bg-white/[0.03] p-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-zinc-100">{clients[i.clientId]?.name}</span>
                    <Pill tone={interventionStatus[i.status].tone}>{interventionStatus[i.status].label}</Pill>
                  </div>
                  <p className="mt-1 text-xs text-zinc-500">
                    {i.startTime} · {Math.round(i.durationMin / 60 * 10) / 10} h ·{' '}
                    {i.assignedEmployeeIds.map((e) => employees[e]?.firstName).filter(Boolean).join(', ')}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function toneBg(status: string) {
  switch (status) {
    case 'completed': return 'bg-neon-mint/15 text-neon-mint';
    case 'inprogress': return 'bg-neon-amber/15 text-neon-amber';
    case 'cancelled': return 'bg-neon-coral/15 text-neon-coral line-through';
    default: return 'bg-neon-cyan/15 text-neon-cyan';
  }
}
