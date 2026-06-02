import { useMemo } from 'react';
import {
  ResponsiveContainer, AreaChart, Area, XAxis, Tooltip,
} from 'recharts';
import {
  Users, FileText, Receipt, CalendarClock, AlertTriangle, ArrowRight,
  TrendingUp, Clock, CheckCircle2,
} from 'lucide-react';
import { useStore } from '@/store/useStore';
import type { View } from '@/app/nav';
import { BentoCard } from '@/ui/Card';
import { Stat } from '@/ui/Stat';
import { Pill } from '@/ui/Pill';
import { Money } from '@/ui/Money';
import { Avatar } from '@/ui/Avatar';
import { computeTaxes } from '@/domain/quebec';
import { interventionStatus } from '@/domain/labels';
import {
  todayISO, addDaysISO, addMonthsISO, prettyDate, format, fromISO, fr,
} from '@/domain/dates';
import { isOverdue, monthKey } from '@/app/selectors';

export function Dashboard({ onNavigate }: { onNavigate: (v: View) => void }) {
  const s = useStore();
  const today = todayISO();
  const in7 = addDaysISO(today, 7);

  const clients = Object.values(s.clients);
  const activeClients = clients.filter((c) => c.status === 'active').length;
  const activeContracts = Object.values(s.contracts).filter((c) => c.status === 'active').length;

  const upcoming = useMemo(
    () =>
      Object.values(s.interventions)
        .filter((i) => i.date >= today && i.status !== 'cancelled')
        .sort((a, b) => (a.date === b.date ? a.startTime.localeCompare(b.startTime) : a.date < b.date ? -1 : 1))
        .slice(0, 6),
    [s.interventions, today],
  );

  const todayInterventions = Object.values(s.interventions).filter((i) => i.date === today && i.status !== 'cancelled');

  const overdueInvoices = Object.values(s.invoices).filter(isOverdue);
  const outstanding = Object.values(s.invoices)
    .filter((i) => i.status !== 'paid' && i.status !== 'cancelled')
    .reduce((sum, i) => sum + computeTaxes(i.lines, i.gstRate, i.qstRate).total, 0);

  const monthRevenue = useMemo(() => {
    const key = monthKey(today);
    return Object.values(s.invoices)
      .filter((i) => i.status === 'paid' && monthKey(i.paidDate ?? i.issueDate) === key)
      .reduce((sum, i) => sum + computeTaxes(i.lines, i.gstRate, i.qstRate).subtotal, 0);
  }, [s.invoices, today]);

  const revenueTrend = useMemo(() => {
    const months: { label: string; key: string; total: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const iso = addMonthsISO(today, -i);
      const key = monthKey(iso);
      months.push({ key, label: format(fromISO(key + '-01'), 'MMM', { locale: fr }), total: 0 });
    }
    Object.values(s.invoices).filter((i) => i.status === 'paid').forEach((inv) => {
      const m = months.find((x) => x.key === monthKey(inv.paidDate ?? inv.issueDate));
      if (m) m.total += computeTaxes(inv.lines, inv.gstRate, inv.qstRate).subtotal;
    });
    return months;
  }, [s.invoices, today]);

  const followUps = Object.values(s.leads)
    .filter((l) => l.nextFollowUp && l.nextFollowUp <= in7 && l.stage !== 'won' && l.stage !== 'lost')
    .sort((a, b) => (a.nextFollowUp! < b.nextFollowUp! ? -1 : 1));

  return (
    <div className="space-y-4">
      {/* KPIs */}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <BentoCard size="sm" accent="violet" className="cursor-pointer" onClick={() => onNavigate('clients')}>
          <Stat label="Clients actifs" value={String(activeClients)} hint={`${clients.length} au total`} />
          <Users className="absolute right-5 top-5 h-5 w-5 text-neon-violet/40" />
        </BentoCard>
        <BentoCard size="sm" accent="cyan" className="cursor-pointer" onClick={() => onNavigate('contracts')}>
          <Stat label="Contrats actifs" value={String(activeContracts)} hint="récurrents" />
          <FileText className="absolute right-5 top-5 h-5 w-5 text-neon-cyan/40" />
        </BentoCard>
        <BentoCard size="sm" accent="mint" className="cursor-pointer" onClick={() => onNavigate('reports')}>
          <Stat label="Revenus du mois" value={<Money amount={monthRevenue} compact />} hint="hors taxes, encaissé" />
          <TrendingUp className="absolute right-5 top-5 h-5 w-5 text-neon-mint/40" />
        </BentoCard>
        <BentoCard size="sm" accent="coral" className="cursor-pointer" onClick={() => onNavigate('invoices')}>
          <Stat label="À encaisser" value={<Money amount={outstanding} compact />} hint={`${overdueInvoices.length} en retard`} />
          <Receipt className="absolute right-5 top-5 h-5 w-5 text-neon-coral/40" />
        </BentoCard>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {/* Revenue trend */}
        <BentoCard title={<span className="flex items-center gap-2"><TrendingUp className="h-3.5 w-3.5" /> Tendance des revenus</span>} size="lg" className="lg:col-span-2" flush>
          <div className="h-[240px] px-1 pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={revenueTrend} margin={{ top: 10, right: 16, left: 16, bottom: 0 }}>
                <defs>
                  <linearGradient id="rev" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#a78bfa" stopOpacity={0.5} />
                    <stop offset="100%" stopColor="#a78bfa" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="label" tick={{ fill: '#71717a', fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{ background: 'rgba(10,12,18,0.95)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, fontSize: 12 }}
                  formatter={(v: number) => [`${v.toFixed(0)} $`, 'Revenus']}
                  cursor={{ stroke: 'rgba(255,255,255,0.1)' }}
                />
                <Area type="monotone" dataKey="total" stroke="#a78bfa" strokeWidth={2.5} fill="url(#rev)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </BentoCard>

        {/* Alerts */}
        <BentoCard title={<span className="flex items-center gap-2"><AlertTriangle className="h-3.5 w-3.5" /> Alertes</span>} size="lg">
          <div className="space-y-2">
            {overdueInvoices.length === 0 && followUps.length === 0 && (
              <p className="flex items-center gap-2 py-6 text-sm text-zinc-500">
                <CheckCircle2 className="h-4 w-4 text-neon-mint" /> Tout est à jour 🎉
              </p>
            )}
            {overdueInvoices.slice(0, 3).map((inv) => (
              <button
                key={inv.id}
                onClick={() => onNavigate('invoices')}
                className="flex w-full items-center justify-between rounded-xl bg-neon-coral/10 px-3 py-2 text-left text-sm ring-1 ring-inset ring-neon-coral/20"
              >
                <span className="text-zinc-200">Facture {inv.number} en retard</span>
                <Money amount={computeTaxes(inv.lines, inv.gstRate, inv.qstRate).total} className="text-neon-coral" />
              </button>
            ))}
            {followUps.slice(0, 3).map((l) => (
              <button
                key={l.id}
                onClick={() => onNavigate('leads')}
                className="flex w-full items-center justify-between rounded-xl bg-neon-amber/10 px-3 py-2 text-left text-sm ring-1 ring-inset ring-neon-amber/20"
              >
                <span className="text-zinc-200">Relancer {l.name}</span>
                <span className="text-xs text-neon-amber">{prettyDate(l.nextFollowUp!)}</span>
              </button>
            ))}
          </div>
        </BentoCard>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {/* Today */}
        <BentoCard title={<span className="flex items-center gap-2"><Clock className="h-3.5 w-3.5" /> Aujourd’hui</span>} size="lg">
          {todayInterventions.length === 0 ? (
            <p className="py-8 text-center text-sm text-zinc-600">Aucune intervention prévue aujourd’hui.</p>
          ) : (
            <div className="space-y-2">
              {todayInterventions.map((i) => (
                <div key={i.id} className="flex items-center gap-3 rounded-xl bg-white/[0.03] p-2.5">
                  <span className="num-display text-sm font-semibold text-neon-violet">{i.startTime}</span>
                  <span className="flex-1 truncate text-sm text-zinc-200">{s.clients[i.clientId]?.name}</span>
                  <Pill tone={interventionStatus[i.status].tone}>{interventionStatus[i.status].label}</Pill>
                </div>
              ))}
            </div>
          )}
        </BentoCard>

        {/* Upcoming */}
        <BentoCard
          title={<span className="flex items-center gap-2"><CalendarClock className="h-3.5 w-3.5" /> Prochaines interventions</span>}
          trailing={<button onClick={() => onNavigate('planning')} className="flex items-center gap-1 hover:text-zinc-300">Planning <ArrowRight className="h-3 w-3" /></button>}
          size="lg"
          className="lg:col-span-2"
        >
          {upcoming.length === 0 ? (
            <p className="py-8 text-center text-sm text-zinc-600">Aucune intervention à venir.</p>
          ) : (
            <div className="grid gap-2 sm:grid-cols-2">
              {upcoming.map((i) => (
                <button
                  key={i.id}
                  onClick={() => onNavigate('interventions')}
                  className="flex items-center gap-3 rounded-xl bg-white/[0.03] p-2.5 text-left"
                >
                  <Avatar name={s.clients[i.clientId]?.name ?? '?'} size="sm" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm text-zinc-200">{s.clients[i.clientId]?.name}</p>
                    <p className="text-xs text-zinc-500">{prettyDate(i.date, { weekday: 'short', day: 'numeric', month: 'short' })} · {i.startTime}</p>
                  </div>
                  <Money amount={i.amount} className="text-xs text-zinc-400" />
                </button>
              ))}
            </div>
          )}
        </BentoCard>
      </div>
    </div>
  );
}
