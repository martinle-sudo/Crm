import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { addDays, format } from 'date-fns';
import { fr } from 'date-fns/locale';
import {
  FlaskConical,
  Plus,
  Trash2,
  Eye,
  EyeOff,
} from 'lucide-react';
import { useStore } from '@/store/useStore';
import { createScenario, addOneOff } from '@/domain/scenarios';
import { Money } from '@/ui/Money';
import { MoneyInput } from '@/ui/MoneyInput';
import { Button } from '@/ui/Button';
import { IconButton } from '@/ui/IconButton';
import { cn } from '@/ui/cn';
import { todayISO, toISO, fromISO } from '@/domain/dates';

export function ScenariosPanel() {
  const scenarios = useStore((s) => s.scenarios);
  const upsert = useStore((s) => s.upsertScenario);
  const remove = useStore((s) => s.removeScenario);
  const toggle = useStore((s) => s.toggleScenario);

  const [draftOpen, setDraftOpen] = useState(false);
  const [name, setName] = useState('');
  const [amount, setAmount] = useState(0);
  const [daysAhead, setDaysAhead] = useState('30');
  const [direction, setDirection] = useState<'expense' | 'income'>('expense');

  const list = Object.values(scenarios).sort((a, b) =>
    a.createdAt < b.createdAt ? 1 : -1,
  );

  const submit = () => {
    if (!name.trim() || amount <= 0) return;
    const signed = direction === 'expense' ? -Math.abs(amount) : Math.abs(amount);
    const date = toISO(addDays(new Date(), Number(daysAhead) || 0));
    let scenario = createScenario(name.trim());
    scenario = addOneOff(scenario, {
      date,
      amount: signed,
      label: name.trim(),
    });
    upsert(scenario);
    setName('');
    setAmount(0);
    setDaysAhead('30');
    setDirection('expense');
    setDraftOpen(false);
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-[10px] uppercase tracking-[0.18em] text-zinc-500 font-medium flex items-center gap-2">
            <FlaskConical className="h-3 w-3" />
            Mode "Et si ?"
          </div>
          <div className="num-display text-xl font-semibold mt-0.5">
            Scénarios
          </div>
          <p className="text-xs text-zinc-500 mt-1">
            Simule un achat, un bonus, un imprévu. Active/désactive pour comparer les courbes.
          </p>
        </div>
        <Button
          variant="primary"
          size="sm"
          onClick={() => setDraftOpen((o) => !o)}
        >
          <Plus className="h-3.5 w-3.5" />
          Nouveau
        </Button>
      </div>

      <AnimatePresence>
        {draftOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.28 }}
            className="overflow-hidden"
          >
            <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-3 flex flex-col gap-2">
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Achat MacBook Pro"
                className="w-full rounded-xl bg-white/5 px-3 py-2 text-sm placeholder:text-zinc-600 outline-none focus:ring-2 focus:ring-neon-violet/50"
              />
              <div className="grid grid-cols-3 gap-2">
                <div className="col-span-1 flex rounded-xl bg-white/5 p-1">
                  <button
                    onClick={() => setDirection('expense')}
                    className={cn(
                      'flex-1 rounded-lg text-xs py-1.5',
                      direction === 'expense'
                        ? 'bg-neon-coral/20 text-neon-coral'
                        : 'text-zinc-500',
                    )}
                  >
                    -
                  </button>
                  <button
                    onClick={() => setDirection('income')}
                    className={cn(
                      'flex-1 rounded-lg text-xs py-1.5',
                      direction === 'income'
                        ? 'bg-neon-mint/20 text-neon-mint'
                        : 'text-zinc-500',
                    )}
                  >
                    +
                  </button>
                </div>
                <MoneyInput
                  value={amount}
                  onChange={setAmount}
                  placeholder="1500"
                  className="col-span-1 rounded-xl bg-white/5 px-3 py-2 text-sm placeholder:text-zinc-600 outline-none focus:ring-2 focus:ring-neon-violet/50"
                />
                <div className="col-span-1 flex items-center gap-2 rounded-xl bg-white/5 px-3">
                  <span className="text-zinc-500 text-xs">J+</span>
                  <input
                    value={daysAhead}
                    onChange={(e) => setDaysAhead(e.target.value)}
                    inputMode="numeric"
                    className="w-full bg-transparent text-sm outline-none num-display"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-1">
                <Button variant="ghost" size="sm" onClick={() => setDraftOpen(false)}>
                  Annuler
                </Button>
                <Button variant="primary" size="sm" onClick={submit}>
                  Ajouter
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex flex-col gap-2">
        {list.length === 0 && !draftOpen && (
          <div className="rounded-2xl border border-dashed border-white/10 p-4 text-xs text-zinc-500 text-center">
            Aucun scénario actif. Crée-en un pour visualiser l'impact d'une dépense.
          </div>
        )}
        {list.map((sc) => {
          const total = sc.additions.reduce((a, b) => a + b.amount, 0);
          const firstDate = sc.additions[0]?.date ?? todayISO();
          return (
            <motion.div
              key={sc.id}
              layout
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              className={cn(
                'rounded-2xl border p-3 flex items-center gap-3',
                sc.active
                  ? 'border-white/10 bg-white/[0.04]'
                  : 'border-white/5 bg-white/[0.015] opacity-70',
              )}
              style={
                sc.active
                  ? {
                      boxShadow: `0 0 0 1px ${sc.color}33, 0 16px 32px -16px ${sc.color}55`,
                    }
                  : undefined
              }
            >
              <div
                className="h-8 w-8 rounded-xl flex items-center justify-center text-xs font-bold"
                style={{
                  background: `${sc.color}20`,
                  color: sc.color,
                  boxShadow: `inset 0 0 0 1px ${sc.color}40`,
                }}
              >
                {sc.name.slice(0, 1).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm text-zinc-200 truncate">{sc.name}</div>
                <div className="text-[10px] text-zinc-500">
                  {format(fromISO(firstDate), 'd MMM yyyy', { locale: fr })}
                </div>
              </div>
              <div className="num-display text-sm">
                <Money
                  amount={total}
                  signDisplay="always"
                  colorize
                />
              </div>
              <div className="flex items-center gap-1">
                <IconButton onClick={() => toggle(sc.id)} tone="violet">
                  {sc.active ? (
                    <Eye className="h-3.5 w-3.5" />
                  ) : (
                    <EyeOff className="h-3.5 w-3.5" />
                  )}
                </IconButton>
                <IconButton onClick={() => remove(sc.id)} tone="coral">
                  <Trash2 className="h-3.5 w-3.5" />
                </IconButton>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
