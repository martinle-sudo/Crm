import { useMemo } from 'react';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid,
  PieChart, Pie, Cell, LineChart, Line,
} from 'recharts';
import { TrendingUp, Clock, Sparkles, Users } from 'lucide-react';
import { useStore } from '@/store/useStore';
import { BentoCard } from '@/ui/Card';
import { Stat } from '@/ui/Stat';
import { Money } from '@/ui/Money';
import { computeTaxes } from '@/domain/quebec';
import { addMonthsISO, todayISO, format, fromISO, fr } from '@/domain/dates';
import { monthKey } from '@/app/selectors';

const COLORS = ['#a78bfa', '#67e8f9', '#6ee7b7', '#fcd34d', '#fda4af', '#c4b5fd'];

export function Reports() {
  const invoices = useStore((s) => s.invoices);
  const interventions = useStore((s) => s.interventions);
  const services = useStore((s) => s.services);
  const employees = useStore((s) => s.employees);
  const clients = useStore((s) => s.clients);

  // Revenus par mois (12 derniers mois, factures payées)
  const revenueByMonth = useMemo(() => {
    const months: { key: string; label: string; total: number }[] = [];
    for (let i = 11; i >= 0; i--) {
      const iso = addMonthsISO(todayISO(), -i);
      const key = monthKey(iso);
      months.push({ key, label: format(fromISO(key + '-01'), 'MMM', { locale: fr }), total: 0 });
    }
    Object.values(invoices)
      .filter((inv) => inv.status === 'paid')
      .forEach((inv) => {
        const key = monthKey(inv.paidDate ?? inv.issueDate);
        const m = months.find((x) => x.key === key);
        if (m) m.total += computeTaxes(inv.lines, inv.gstRate, inv.qstRate).subtotal;
      });
    return months;
  }, [invoices]);

  // Revenus par catégorie de service (interventions complétées)
  const revenueByService = useMemo(() => {
    const map: Record<string, number> = {};
    Object.values(interventions)
      .filter((i) => i.status === 'completed')
      .forEach((i) => {
        i.serviceIds.forEach((sid) => {
          const svc = services[sid];
          if (svc) map[svc.name] = (map[svc.name] ?? 0) + svc.unitPrice;
        });
      });
    return Object.entries(map).map(([name, value]) => ({ name, value }));
  }, [interventions, services]);

  // Heures par employé
  const hoursByEmployee = useMemo(() => {
    const map: Record<string, number> = {};
    Object.values(interventions)
      .filter((i) => i.status === 'completed')
      .forEach((i) => {
        const h = (i.actualHours ?? i.durationMin / 60) / Math.max(1, i.assignedEmployeeIds.length);
        i.assignedEmployeeIds.forEach((eid) => {
          map[eid] = (map[eid] ?? 0) + h;
        });
      });
    return Object.entries(map).map(([eid, hours]) => ({
      name: employees[eid]?.firstName ?? '—',
      hours: Math.round(hours),
    }));
  }, [interventions, employees]);

  // Croissance clients actifs cumulés par mois de création
  const clientGrowth = useMemo(() => {
    const months = revenueByMonth.map((m) => ({ label: m.label, key: m.key, count: 0 }));
    Object.values(clients).forEach((c) => {
      const key = monthKey(c.createdAt);
      const idx = months.findIndex((m) => m.key >= key);
      const target = idx === -1 ? months.length - 1 : idx;
      for (let i = target; i < months.length; i++) months[i].count += 1;
    });
    return months;
  }, [clients, revenueByMonth]);

  const totalRevenue = revenueByMonth.reduce((s, m) => s + m.total, 0);
  const totalHours = hoursByEmployee.reduce((s, e) => s + e.hours, 0);
  const activeClients = Object.values(clients).filter((c) => c.status === 'active').length;
  const lostClients = Object.values(clients).filter((c) => c.status === 'lost').length;
  const retention = activeClients + lostClients > 0
    ? Math.round((activeClients / (activeClients + lostClients)) * 100)
    : 100;

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <BentoCard size="sm" accent="violet">
          <Stat label="Revenus (12 mois)" value={<Money amount={totalRevenue} compact />} hint="factures payées, hors taxes" />
        </BentoCard>
        <BentoCard size="sm" accent="cyan">
          <Stat label="Heures travaillées" value={`${totalHours} h`} hint="interventions complétées" />
        </BentoCard>
        <BentoCard size="sm" accent="mint">
          <Stat label="Clients actifs" value={String(activeClients)} hint={`${Object.keys(clients).length} au total`} />
        </BentoCard>
        <BentoCard size="sm" accent="amber">
          <Stat label="Taux de rétention" value={`${retention} %`} hint={`${lostClients} client(s) perdu(s)`} />
        </BentoCard>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <BentoCard title={<span className="flex items-center gap-2"><TrendingUp className="h-3.5 w-3.5" /> Revenus par mois</span>} size="lg" flush>
          <div className="h-[260px] px-2 pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={revenueByMonth} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                <XAxis dataKey="label" tick={{ fill: '#71717a', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#71717a', fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip {...tooltipStyle} formatter={(v: number) => [`${v.toFixed(0)} $`, 'Revenus']} />
                <Bar dataKey="total" fill="#a78bfa" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </BentoCard>

        <BentoCard title={<span className="flex items-center gap-2"><Sparkles className="h-3.5 w-3.5" /> Revenus par service</span>} size="lg" flush>
          <div className="h-[260px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={revenueByService} dataKey="value" nameKey="name" innerRadius={55} outerRadius={90} paddingAngle={3}>
                  {revenueByService.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip {...tooltipStyle} formatter={(v: number) => [`${v.toFixed(0)} $`, '']} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex flex-wrap gap-x-4 gap-y-1 px-5 pb-4">
            {revenueByService.map((s, i) => (
              <span key={s.name} className="flex items-center gap-1.5 text-[11px] text-zinc-400">
                <span className="h-2 w-2 rounded-full" style={{ background: COLORS[i % COLORS.length] }} /> {s.name}
              </span>
            ))}
          </div>
        </BentoCard>

        <BentoCard title={<span className="flex items-center gap-2"><Clock className="h-3.5 w-3.5" /> Heures par employé</span>} size="lg" flush>
          <div className="h-[260px] px-2 pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={hoursByEmployee} layout="vertical" margin={{ top: 10, right: 16, left: 10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" horizontal={false} />
                <XAxis type="number" tick={{ fill: '#71717a', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="name" tick={{ fill: '#a1a1aa', fontSize: 12 }} axisLine={false} tickLine={false} width={70} />
                <Tooltip {...tooltipStyle} formatter={(v: number) => [`${v} h`, 'Heures']} />
                <Bar dataKey="hours" fill="#67e8f9" radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </BentoCard>

        <BentoCard title={<span className="flex items-center gap-2"><Users className="h-3.5 w-3.5" /> Croissance des clients</span>} size="lg" flush>
          <div className="h-[260px] px-2 pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={clientGrowth} margin={{ top: 10, right: 16, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                <XAxis dataKey="label" tick={{ fill: '#71717a', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#71717a', fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip {...tooltipStyle} formatter={(v: number) => [`${v} clients`, '']} />
                <Line type="monotone" dataKey="count" stroke="#6ee7b7" strokeWidth={2.5} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </BentoCard>
      </div>
    </div>
  );
}

const tooltipStyle = {
  contentStyle: {
    background: 'rgba(10,12,18,0.95)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: 12,
    fontSize: 12,
    color: '#e4e4e7',
  },
  cursor: { fill: 'rgba(255,255,255,0.04)' },
} as const;
