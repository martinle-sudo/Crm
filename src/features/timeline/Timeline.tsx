import { useMemo, useState } from 'react';
import { addDays, format } from 'date-fns';
import { fr } from 'date-fns/locale';
import {
  Area,
  AreaChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { motion } from 'framer-motion';
import { CalendarDays, TrendingDown, TrendingUp } from 'lucide-react';
import { useStore } from '@/store/useStore';
import { useProjection } from './useProjection';
import { Money } from '@/ui/Money';
import { Pill } from '@/ui/Pill';
import { fromISO, toISO } from '@/domain/dates';
import { cn } from '@/ui/cn';

const HORIZON_OPTIONS = [
  { label: '30 j', days: 30 },
  { label: '90 j', days: 90 },
  { label: '6 mois', days: 182 },
  { label: '1 an', days: 365 },
];

export function Timeline() {
  const profile = useStore((s) => s.profile);
  const [horizonDays, setHorizonDays] = useState(90);

  const today = useMemo(() => new Date(), []);
  const fromDate = today;
  const toDate = useMemo(
    () => addDays(today, horizonDays),
    [today, horizonDays],
  );
  const fromISOStr = toISO(fromDate);
  const toISOStr = toISO(toDate);

  const series = useProjection({ from: fromISOStr, to: toISOStr });

  const [cursorDay, setCursorDay] = useState(() => Math.min(30, horizonDays));
  const safeCursor = Math.min(cursorDay, series.length - 1);
  const cursorPoint = series[safeCursor];

  const minBalance = useMemo(
    () => Math.min(...series.map((d) => d.closingBalance), 0),
    [series],
  );
  const maxBalance = useMemo(
    () => Math.max(...series.map((d) => d.closingBalance), 0),
    [series],
  );

  const trend =
    series.length > 1
      ? series[series.length - 1].closingBalance - series[0].closingBalance
      : 0;

  const cursorDate = cursorPoint
    ? format(fromISO(cursorPoint.date), 'EEEE d MMMM yyyy', { locale: fr })
    : '';

  const sliderPct = (safeCursor / Math.max(1, series.length - 1)) * 100;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="text-[10px] uppercase tracking-[0.18em] text-zinc-500 font-medium mb-2 flex items-center gap-2">
            <CalendarDays className="h-3 w-3" />
            <span>Solde projeté</span>
            <span className="text-zinc-600">·</span>
            <span className="capitalize">{cursorDate}</span>
          </div>
          <motion.div
            key={cursorPoint?.closingBalance}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.32 }}
            className="num-display text-5xl md:text-6xl font-semibold tracking-tight"
          >
            <Money
              amount={cursorPoint?.closingBalance ?? profile.openingBalance}
              className={cn(
                cursorPoint?.stress === 'critical' && 'text-neon-coral',
                cursorPoint?.stress === 'warning' && 'text-neon-amber',
                cursorPoint?.stress === 'okay' && 'text-zinc-100',
                cursorPoint?.stress === 'comfortable' && 'text-neon-mint',
              )}
            />
          </motion.div>
          <div className="mt-2 flex items-center gap-2 text-xs text-zinc-400">
            {trend >= 0 ? (
              <Pill tone="mint">
                <TrendingUp className="h-3 w-3" />
                <Money amount={trend} signDisplay="always" />
              </Pill>
            ) : (
              <Pill tone="coral">
                <TrendingDown className="h-3 w-3" />
                <Money amount={trend} signDisplay="always" />
              </Pill>
            )}
            <span>sur {horizonDays} jours</span>
          </div>
        </div>

        <div className="flex gap-1 rounded-xl bg-white/5 p-1 ring-1 ring-inset ring-white/10">
          {HORIZON_OPTIONS.map((opt) => (
            <button
              key={opt.days}
              onClick={() => {
                setHorizonDays(opt.days);
                setCursorDay((c) => Math.min(c, opt.days));
              }}
              className={cn(
                'px-3 py-1.5 text-xs rounded-lg transition-colors',
                horizonDays === opt.days
                  ? 'bg-white/10 text-zinc-100'
                  : 'text-zinc-400 hover:text-zinc-200',
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      <div className="h-56 -mx-1">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={series}
            margin={{ top: 4, right: 4, left: 4, bottom: 4 }}
          >
            <defs>
              <linearGradient id="balanceGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#a78bfa" stopOpacity={0.55} />
                <stop offset="100%" stopColor="#a78bfa" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="balanceLine" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#a78bfa" />
                <stop offset="100%" stopColor="#67e8f9" />
              </linearGradient>
            </defs>
            <XAxis dataKey="date" hide type="category" />
            <YAxis
              hide
              domain={[Math.min(minBalance * 1.1, 0), maxBalance * 1.1]}
            />
            <Tooltip
              cursor={{
                stroke: 'rgba(255,255,255,0.15)',
                strokeDasharray: '3 3',
              }}
              content={<TooltipContent />}
            />
            <ReferenceLine
              y={0}
              stroke="rgba(253,164,175,0.35)"
              strokeDasharray="3 3"
            />
            {cursorPoint && (
              <ReferenceLine
                x={cursorPoint.date}
                stroke="url(#balanceLine)"
                strokeWidth={2}
              />
            )}
            <Area
              type="monotone"
              dataKey="closingBalance"
              stroke="url(#balanceLine)"
              strokeWidth={2.5}
              fill="url(#balanceGrad)"
              isAnimationActive={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="flex flex-col gap-2">
        <input
          type="range"
          min={0}
          max={Math.max(0, series.length - 1)}
          value={safeCursor}
          onChange={(e) => setCursorDay(Number(e.target.value))}
          className="cashflow-slider"
          style={
            {
              ['--pct' as never]: `${sliderPct}%`,
            } as React.CSSProperties
          }
        />
        <div className="flex justify-between text-[10px] uppercase tracking-[0.18em] text-zinc-500">
          <span>Aujourd'hui</span>
          <span>J+{Math.max(0, series.length - 1)}</span>
        </div>
      </div>

      {cursorPoint && cursorPoint.events.length > 0 && (
        <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-3">
          <div className="text-[10px] uppercase tracking-[0.18em] text-zinc-500 mb-2">
            Événements du jour
          </div>
          <ul className="space-y-1.5">
            {cursorPoint.events.slice(0, 5).map((e, i) => (
              <li
                key={i}
                className="flex items-center justify-between text-sm"
              >
                <span className="text-zinc-300 flex items-center gap-2">
                  {e.shifted && (
                    <span className="text-neon-amber text-xs">↪</span>
                  )}
                  {e.label}
                  {e.source === 'scenario' && (
                    <Pill tone="violet">scénario</Pill>
                  )}
                </span>
                <Money
                  amount={e.amount}
                  signDisplay="always"
                  colorize
                  className="num-display"
                />
              </li>
            ))}
          </ul>
        </div>
      )}

      <style>{`
        .cashflow-slider {
          -webkit-appearance: none;
          appearance: none;
          width: 100%;
          height: 6px;
          border-radius: 999px;
          background: linear-gradient(to right,
            rgba(167,139,250,0.7) 0%,
            rgba(103,232,249,0.7) var(--pct, 0%),
            rgba(255,255,255,0.08) var(--pct, 0%),
            rgba(255,255,255,0.08) 100%);
          outline: none;
          cursor: grab;
        }
        .cashflow-slider:active { cursor: grabbing; }
        .cashflow-slider::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 22px;
          height: 22px;
          border-radius: 999px;
          background: #fff;
          box-shadow:
            0 0 0 4px rgba(167,139,250,0.25),
            0 0 24px rgba(167,139,250,0.55);
          border: none;
          transition: transform 0.18s ease;
        }
        .cashflow-slider::-webkit-slider-thumb:hover { transform: scale(1.1); }
        .cashflow-slider::-moz-range-thumb {
          width: 22px;
          height: 22px;
          border-radius: 999px;
          background: #fff;
          border: none;
          box-shadow:
            0 0 0 4px rgba(167,139,250,0.25),
            0 0 24px rgba(167,139,250,0.55);
        }
      `}</style>
    </div>
  );
}

function TooltipContent({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{ payload: { date: string; closingBalance: number } }>;
}) {
  if (!active || !payload || payload.length === 0) return null;
  const p = payload[0].payload;
  return (
    <div className="rounded-xl bg-ink-850/95 backdrop-blur ring-1 ring-white/10 px-3 py-2 text-xs">
      <div className="text-zinc-400 mb-1">
        {format(fromISO(p.date), 'd MMM yyyy', { locale: fr })}
      </div>
      <div className="num-display text-zinc-100">
        <Money amount={p.closingBalance} />
      </div>
    </div>
  );
}
