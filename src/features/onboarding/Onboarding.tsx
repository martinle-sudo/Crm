import { useMemo, useState } from 'react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Plus,
  Sparkles,
  Trash2,
  Wallet,
  TrendingUp,
  Home as HomeIcon,
  Repeat,
  Gauge,
  Receipt,
} from 'lucide-react';
import { nanoid } from 'nanoid';
import { useStore } from '@/store/useStore';
import { Button } from '@/ui/Button';
import { IconButton } from '@/ui/IconButton';
import { Money } from '@/ui/Money';
import { MoneyInput } from '@/ui/MoneyInput';
import { cn } from '@/ui/cn';
import { toISO, fromISO } from '@/domain/dates';
import {
  monthlyTotals,
  suggestThresholds,
  type IncomeFrequency,
  type OnboardingForm,
  type FixedExpenseEntry,
  type SubscriptionEntry,
} from './buildState';
import {
  SUBSCRIPTION_PRESETS,
  FIXED_EXPENSE_PRESETS,
  type ExpenseFrequency,
} from './presets';

const TOTAL_STEPS = 6;

const STEP_META = [
  { icon: Sparkles, title: 'Bienvenue' },
  { icon: Wallet, title: 'Profil & solde' },
  { icon: TrendingUp, title: 'Revenus' },
  { icon: HomeIcon, title: 'Charges fixes' },
  { icon: Repeat, title: 'Abonnements' },
  { icon: Gauge, title: 'Tableau de bord' },
] as const;

const emptyForm = (): OnboardingForm => ({
  currency: 'CAD',
  locale: 'fr-CA',
  openingBalance: 0,
  income: {
    label: 'Salaire',
    amount: 0,
    frequency: 'biweekly',
    firstDate: toISO(new Date()),
  },
  fixedExpenses: [],
  subscriptions: [],
  thresholds: { critical: 100, warning: 500, comfortable: 2000 },
});

export function Onboarding() {
  const completeOnboarding = useStore((s) => s.completeOnboarding);
  const useDemoData = useStore((s) => s.useDemoData);

  const [step, setStep] = useState(0);
  const [form, setForm] = useState<OnboardingForm>(emptyForm);
  const [thresholdsTouched, setThresholdsTouched] = useState(false);

  const totals = useMemo(() => monthlyTotals(form), [form]);
  const suggested = useMemo(
    () => suggestThresholds(totals.outflow),
    [totals.outflow],
  );

  const next = () => {
    if (step === 4 && !thresholdsTouched) {
      setForm((f) => ({ ...f, thresholds: suggested }));
    }
    setStep((s) => Math.min(TOTAL_STEPS - 1, s + 1));
  };
  const back = () => setStep((s) => Math.max(0, s - 1));

  const finish = () => {
    completeOnboarding(form);
  };

  const canContinue = (() => {
    switch (step) {
      case 0:
        return true;
      case 1:
        return Boolean(form.currency && form.locale);
      case 2:
        return form.income.label.trim().length > 0 && form.income.amount > 0;
      case 3:
      case 4:
        return true;
      case 5:
        return true;
      default:
        return false;
    }
  })();

  const StepIcon = STEP_META[step].icon;

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-10">
      <motion.div
        initial={{ opacity: 0, y: 12, scale: 0.99 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
        className="w-full max-w-2xl bento-card overflow-visible"
      >
        <div className="relative z-[1] p-6 md:p-8">
          <div className="flex items-center justify-between gap-3 mb-6">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-2xl bg-gradient-to-br from-neon-violet to-neon-cyan flex items-center justify-center shadow-glow-violet">
                <StepIcon className="h-4 w-4 text-ink-950" strokeWidth={2.5} />
              </div>
              <div>
                <div className="text-[10px] uppercase tracking-[0.18em] text-zinc-500">
                  Étape {step + 1} / {TOTAL_STEPS}
                </div>
                <div className="font-display text-base font-semibold">
                  {STEP_META[step].title}
                </div>
              </div>
            </div>
            <button
              onClick={useDemoData}
              className="text-[11px] uppercase tracking-[0.14em] text-zinc-500 hover:text-zinc-200 transition-colors"
            >
              Voir la démo →
            </button>
          </div>

          <Progress current={step} total={TOTAL_STEPS} />

          <div className="mt-8 min-h-[320px]">
            <AnimatePresence mode="wait">
              <motion.div
                key={step}
                initial={{ opacity: 0, x: 16 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -16 }}
                transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
              >
                {step === 0 && <StepWelcome />}
                {step === 1 && (
                  <StepProfile form={form} setForm={setForm} />
                )}
                {step === 2 && <StepIncome form={form} setForm={setForm} />}
                {step === 3 && (
                  <StepFixedExpenses form={form} setForm={setForm} />
                )}
                {step === 4 && (
                  <StepSubscriptions form={form} setForm={setForm} />
                )}
                {step === 5 && (
                  <StepRecap
                    form={form}
                    setForm={setForm}
                    totals={totals}
                    suggested={suggested}
                    onTouchThresholds={() => setThresholdsTouched(true)}
                  />
                )}
              </motion.div>
            </AnimatePresence>
          </div>

          <div className="mt-8 flex items-center justify-between gap-3">
            <Button
              variant="ghost"
              onClick={back}
              disabled={step === 0}
              className={cn(step === 0 && 'opacity-40 pointer-events-none')}
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Retour
            </Button>
            {step < TOTAL_STEPS - 1 ? (
              <Button
                variant="primary"
                onClick={next}
                disabled={!canContinue}
                className={cn(!canContinue && 'opacity-50 pointer-events-none')}
              >
                Continuer
                <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            ) : (
              <Button variant="primary" onClick={finish}>
                <Check className="h-3.5 w-3.5" />
                Lancer mon tableau de bord
              </Button>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
}

function Progress({ current, total }: { current: number; total: number }) {
  return (
    <div className="flex items-center gap-1.5">
      {Array.from({ length: total }).map((_, i) => (
        <div
          key={i}
          className={cn(
            'h-1 rounded-full transition-all duration-500 ease-out',
            i <= current
              ? 'bg-gradient-to-r from-neon-violet to-neon-cyan'
              : 'bg-white/8',
            i === current ? 'flex-[2]' : 'flex-1',
          )}
        />
      ))}
    </div>
  );
}

// ---------- Step 0: Welcome ----------
function StepWelcome() {
  return (
    <div className="space-y-5">
      <div>
        <div className="text-[10px] uppercase tracking-[0.18em] text-zinc-500 mb-2">
          Cashflow
        </div>
        <h1 className="font-display text-3xl md:text-4xl font-semibold tracking-tight">
          Anticipe ton solde,{' '}
          <span className="bg-gradient-to-r from-neon-violet to-neon-cyan bg-clip-text text-transparent">
            jour par jour
          </span>
          .
        </h1>
      </div>
      <p className="text-sm text-zinc-400 leading-relaxed">
        Réponds à 5 questions rapides pour configurer ton tableau de bord. Tes
        données restent sur ton appareil — aucune connexion bancaire, aucun
        compte à créer.
      </p>
      <ul className="space-y-2 text-sm">
        <Feature>Solde projeté à n'importe quelle date future</Feature>
        <Feature>Scénarios "Et si ?" pour simuler un achat</Feature>
        <Feature>Heatmap des journées à risque</Feature>
        <Feature>Calendrier glisser-déposer pour reporter une facture</Feature>
      </ul>
    </div>
  );
}

function Feature({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-2.5 text-zinc-300">
      <Check className="h-4 w-4 text-neon-mint mt-0.5 shrink-0" />
      <span>{children}</span>
    </li>
  );
}

// ---------- Step 1: Profile ----------
const CURRENCIES = [
  { code: 'CAD', symbol: '$', label: 'Dollar canadien', locale: 'fr-CA' },
  { code: 'USD', symbol: '$', label: 'Dollar US', locale: 'en-US' },
  { code: 'EUR', symbol: '€', label: 'Euro', locale: 'fr-FR' },
  { code: 'GBP', symbol: '£', label: 'Livre sterling', locale: 'en-GB' },
  { code: 'CHF', symbol: 'Fr', label: 'Franc suisse', locale: 'fr-CH' },
] as const;

type SetForm = (
  f: OnboardingForm | ((f: OnboardingForm) => OnboardingForm),
) => void;

function StepProfile({ form, setForm }: { form: OnboardingForm; setForm: SetForm }) {
  return (
    <div className="space-y-6">
      <div>
        <Label>Devise</Label>
        <div className="grid grid-cols-5 gap-2 mt-2">
          {CURRENCIES.map((c) => (
            <button
              key={c.code}
              onClick={() =>
                setForm((f) => ({ ...f, currency: c.code, locale: c.locale }))
              }
              className={cn(
                'rounded-xl px-3 py-3 text-left transition-all ring-1 ring-inset',
                form.currency === c.code
                  ? 'bg-neon-violet/15 ring-neon-violet/40 shadow-glow-violet'
                  : 'bg-white/[0.025] ring-white/[0.06] hover:bg-white/[0.05]',
              )}
            >
              <div className="num-display text-lg font-semibold">{c.symbol}</div>
              <div className="text-[10px] uppercase tracking-[0.14em] text-zinc-500">
                {c.code}
              </div>
            </button>
          ))}
        </div>
      </div>

      <div>
        <Label>Solde actuel de ton compte</Label>
        <div className="relative mt-2">
          <MoneyInput
            value={form.openingBalance}
            onChange={(v) =>
              setForm((f) => ({ ...f, openingBalance: v }))
            }
            placeholder="0"
            className="w-full text-4xl md:text-5xl font-semibold bg-transparent outline-none border-b border-white/10 focus:border-neon-violet/50 pb-3 transition-colors placeholder:text-zinc-700"
          />
          <span className="absolute right-0 bottom-3 text-zinc-500 text-sm">
            {form.currency}
          </span>
        </div>
        <p className="text-[11px] text-zinc-500 mt-2">
          C'est le point de départ de toutes les projections. Tu peux saisir
          des décimales (ex. 1234.56).
        </p>
      </div>
    </div>
  );
}

// ---------- Step 2: Income ----------
const FREQUENCIES: Array<{
  key: IncomeFrequency;
  label: string;
  hint: string;
}> = [
  { key: 'weekly', label: 'Hebdo', hint: 'chaque semaine' },
  { key: 'biweekly', label: 'Aux 2 sem.', hint: 'le plus courant' },
  { key: 'semi-monthly', label: 'Bi-mensuel', hint: '1er & 15' },
  { key: 'monthly', label: 'Mensuel', hint: '1× par mois' },
];

function StepIncome({ form, setForm }: { form: OnboardingForm; setForm: SetForm }) {
  return (
    <div className="space-y-6">
      <div>
        <Label>Source de revenu</Label>
        <input
          value={form.income.label}
          onChange={(e) =>
            setForm((f) => ({
              ...f,
              income: { ...f.income, label: e.target.value },
            }))
          }
          placeholder="Salaire"
          className="mt-2 w-full rounded-xl bg-white/5 px-4 py-3 text-sm placeholder:text-zinc-600 outline-none focus:ring-2 focus:ring-neon-violet/50"
        />
      </div>

      <div>
        <Label>Montant net (par paie)</Label>
        <div className="relative mt-2">
          <MoneyInput
            value={form.income.amount}
            onChange={(v) =>
              setForm((f) => ({
                ...f,
                income: { ...f.income, amount: v },
              }))
            }
            placeholder="2350"
            className="w-full text-3xl font-semibold bg-transparent outline-none border-b border-white/10 focus:border-neon-mint/50 pb-3 transition-colors placeholder:text-zinc-700"
          />
          <span className="absolute right-0 bottom-3 text-zinc-500 text-sm">
            {form.currency}
          </span>
        </div>
      </div>

      <div>
        <Label>Fréquence</Label>
        <div className="grid grid-cols-4 gap-2 mt-2">
          {FREQUENCIES.map((f) => (
            <button
              key={f.key}
              onClick={() =>
                setForm((cur) => ({
                  ...cur,
                  income: { ...cur.income, frequency: f.key },
                }))
              }
              className={cn(
                'rounded-xl px-2 py-2.5 text-center transition-all ring-1 ring-inset',
                form.income.frequency === f.key
                  ? 'bg-neon-mint/15 ring-neon-mint/40'
                  : 'bg-white/[0.025] ring-white/[0.06] hover:bg-white/[0.05]',
              )}
            >
              <div className="text-xs font-semibold">{f.label}</div>
              <div className="text-[9px] uppercase tracking-[0.1em] text-zinc-500 mt-0.5">
                {f.hint}
              </div>
            </button>
          ))}
        </div>
      </div>

      <div>
        <Label>Prochaine paie</Label>
        <input
          type="date"
          value={form.income.firstDate}
          onChange={(e) =>
            setForm((f) => ({
              ...f,
              income: { ...f.income, firstDate: e.target.value },
            }))
          }
          className="mt-2 w-full rounded-xl bg-white/5 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-neon-mint/50 num-display"
        />
        <p className="text-[11px] text-zinc-500 mt-2">
          {form.income.frequency === 'semi-monthly'
            ? 'Versé les 1ᵉʳ et 15 de chaque mois.'
            : `Prochaine occurrence : ${format(fromISO(form.income.firstDate), 'EEEE d MMMM', { locale: fr })}.`}
        </p>
      </div>
    </div>
  );
}

// ---------- Step 3: Fixed Expenses ----------
const WEEKDAY_LABELS_SHORT = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];

function StepFixedExpenses({
  form,
  setForm,
}: {
  form: OnboardingForm;
  setForm: SetForm;
}) {
  const addCustom = () => {
    setForm((f) => ({
      ...f,
      fixedExpenses: [
        ...f.fixedExpenses,
        {
          id: nanoid(8),
          label: '',
          amount: 0,
          frequency: 'monthly',
          dayOfMonth: 1,
          weekday: 1,
          categoryId: 'cat-other',
        },
      ],
    }));
  };

  const addPreset = (preset: typeof FIXED_EXPENSE_PRESETS[number]) => {
    if (form.fixedExpenses.some((e) => e.label === preset.label)) return;
    setForm((f) => ({
      ...f,
      fixedExpenses: [
        ...f.fixedExpenses,
        {
          id: nanoid(8),
          label: preset.label,
          amount: preset.defaultAmount,
          frequency: preset.frequency,
          dayOfMonth: preset.defaultDayOfMonth ?? 1,
          weekday: preset.defaultWeekday ?? 1,
          categoryId: preset.categoryId,
        },
      ],
    }));
  };

  const update = (id: string, patch: Partial<FixedExpenseEntry>) => {
    setForm((f) => ({
      ...f,
      fixedExpenses: f.fixedExpenses.map((e) =>
        e.id === id ? { ...e, ...patch } : e,
      ),
    }));
  };

  const remove = (id: string) => {
    setForm((f) => ({
      ...f,
      fixedExpenses: f.fixedExpenses.filter((e) => e.id !== id),
    }));
  };

  const monthlyPresets = FIXED_EXPENSE_PRESETS.filter((p) => p.frequency === 'monthly');
  const weeklyPresets = FIXED_EXPENSE_PRESETS.filter((p) => p.frequency === 'weekly');

  return (
    <div className="space-y-5">
      <p className="text-sm text-zinc-400">
        Loyer, services, virement épargne, épicerie hebdo… ce qui revient
        chaque semaine ou chaque mois.
      </p>

      <div>
        <Label>Mensuels</Label>
        <div className="flex flex-wrap gap-1.5 mt-2">
          {monthlyPresets.map((p) => {
            const added = form.fixedExpenses.some((e) => e.label === p.label);
            return (
              <PresetChip
                key={p.label}
                label={p.label}
                added={added}
                onClick={() => addPreset(p)}
              />
            );
          })}
        </div>
      </div>

      <div>
        <Label>Hebdomadaires</Label>
        <div className="flex flex-wrap gap-1.5 mt-2">
          {weeklyPresets.map((p) => {
            const added = form.fixedExpenses.some((e) => e.label === p.label);
            return (
              <PresetChip
                key={p.label}
                label={p.label}
                added={added}
                tone="cyan"
                onClick={() => addPreset(p)}
              />
            );
          })}
        </div>
      </div>

      <div className="space-y-2">
        <AnimatePresence initial={false}>
          {form.fixedExpenses.map((exp) => (
            <motion.div
              key={exp.id}
              layout
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.22 }}
              className="flex items-center gap-2 rounded-xl bg-white/[0.03] ring-1 ring-inset ring-white/[0.06] p-2"
            >
              <input
                value={exp.label}
                onChange={(e) => update(exp.id, { label: e.target.value })}
                placeholder="Loyer"
                className="flex-1 min-w-0 bg-transparent px-2 py-1.5 text-sm outline-none placeholder:text-zinc-600"
              />
              <MoneyInput
                value={exp.amount}
                onChange={(v) => update(exp.id, { amount: v })}
                placeholder="0"
                className="w-24 text-right bg-transparent px-2 py-1.5 text-sm outline-none placeholder:text-zinc-700"
              />
              <FrequencyToggle
                value={exp.frequency}
                onChange={(freq) => update(exp.id, { frequency: freq })}
              />
              {exp.frequency === 'monthly' ? (
                <div className="flex items-center gap-1 bg-white/[0.04] rounded-lg px-2">
                  <span className="text-[10px] uppercase tracking-[0.1em] text-zinc-500">
                    jour
                  </span>
                  <input
                    inputMode="numeric"
                    value={exp.dayOfMonth}
                    onChange={(e) => {
                      const n = parseInt(e.target.value, 10);
                      update(exp.id, {
                        dayOfMonth: Number.isNaN(n)
                          ? 1
                          : Math.max(1, Math.min(28, n)),
                      });
                    }}
                    className="num-display w-7 text-center bg-transparent py-1.5 text-sm outline-none"
                  />
                </div>
              ) : (
                <select
                  value={exp.weekday}
                  onChange={(e) =>
                    update(exp.id, { weekday: Number(e.target.value) })
                  }
                  className="bg-white/[0.04] rounded-lg px-2 py-1.5 text-xs outline-none cursor-pointer"
                >
                  {WEEKDAY_LABELS_SHORT.map((label, i) => (
                    <option key={i} value={i} className="bg-ink-850">
                      {label}
                    </option>
                  ))}
                </select>
              )}
              <IconButton tone="coral" onClick={() => remove(exp.id)}>
                <Trash2 className="h-3.5 w-3.5" />
              </IconButton>
            </motion.div>
          ))}
        </AnimatePresence>

        <button
          onClick={addCustom}
          className="w-full rounded-xl border border-dashed border-white/10 hover:border-white/20 hover:bg-white/[0.02] py-2.5 text-xs text-zinc-400 hover:text-zinc-200 transition-all flex items-center justify-center gap-2"
        >
          <Plus className="h-3.5 w-3.5" />
          Ajouter une charge
        </button>
      </div>
    </div>
  );
}

function FrequencyToggle({
  value,
  onChange,
}: {
  value: ExpenseFrequency;
  onChange: (next: ExpenseFrequency) => void;
}) {
  return (
    <div className="flex bg-white/[0.04] rounded-lg p-0.5 text-[10px] uppercase tracking-[0.1em]">
      <button
        onClick={() => onChange('monthly')}
        className={cn(
          'px-2 py-1 rounded-md transition-colors',
          value === 'monthly'
            ? 'bg-neon-violet/20 text-neon-violet'
            : 'text-zinc-500 hover:text-zinc-300',
        )}
        title="Mensuel"
      >
        M
      </button>
      <button
        onClick={() => onChange('weekly')}
        className={cn(
          'px-2 py-1 rounded-md transition-colors',
          value === 'weekly'
            ? 'bg-neon-cyan/20 text-neon-cyan'
            : 'text-zinc-500 hover:text-zinc-300',
        )}
        title="Hebdomadaire"
      >
        H
      </button>
    </div>
  );
}

function PresetChip({
  label,
  added,
  tone = 'mint',
  onClick,
  trailing,
}: {
  label: string;
  added: boolean;
  tone?: 'mint' | 'cyan';
  onClick: () => void;
  trailing?: React.ReactNode;
}) {
  const addedClasses =
    tone === 'cyan'
      ? 'bg-neon-cyan/15 ring-neon-cyan/30 text-neon-cyan'
      : 'bg-neon-mint/15 ring-neon-mint/30 text-neon-mint';
  return (
    <button
      onClick={onClick}
      disabled={added}
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] ring-1 ring-inset transition-all',
        added
          ? addedClasses
          : 'bg-white/[0.025] ring-white/[0.06] text-zinc-300 hover:bg-white/[0.06]',
      )}
    >
      {added ? <Check className="h-3 w-3" /> : <Plus className="h-3 w-3" />}
      <span>{label}</span>
      {trailing}
    </button>
  );
}

// ---------- Step 4: Subscriptions ----------
function StepSubscriptions({
  form,
  setForm,
}: {
  form: OnboardingForm;
  setForm: SetForm;
}) {
  const total = form.subscriptions.reduce((a, s) => a + Math.abs(s.amount), 0);

  const addPreset = (preset: typeof SUBSCRIPTION_PRESETS[number]) => {
    if (form.subscriptions.some((s) => s.label === preset.label)) return;
    setForm((f) => ({
      ...f,
      subscriptions: [
        ...f.subscriptions,
        {
          id: nanoid(8),
          label: preset.label,
          vendor: preset.vendor,
          amount: preset.amount,
          dayOfMonth: 15,
        },
      ],
    }));
  };

  const addCustom = () => {
    setForm((f) => ({
      ...f,
      subscriptions: [
        ...f.subscriptions,
        { id: nanoid(8), label: '', amount: 0, dayOfMonth: 15 },
      ],
    }));
  };

  const update = (id: string, patch: Partial<SubscriptionEntry>) => {
    setForm((f) => ({
      ...f,
      subscriptions: f.subscriptions.map((s) =>
        s.id === id ? { ...s, ...patch } : s,
      ),
    }));
  };
  const remove = (id: string) => {
    setForm((f) => ({
      ...f,
      subscriptions: f.subscriptions.filter((s) => s.id !== id),
    }));
  };

  return (
    <div className="space-y-5">
      <div className="flex items-baseline justify-between">
        <p className="text-sm text-zinc-400">
          Sélectionne tes abonnements actifs. Tu pourras les ajuster plus tard.
        </p>
        {total > 0 && (
          <div className="text-sm">
            <span className="text-zinc-500">Total / mois&nbsp;</span>
            <Money amount={-total} className="num-display text-neon-coral" />
          </div>
        )}
      </div>

      <div>
        <Label>Services courants</Label>
        <div className="flex flex-wrap gap-1.5 mt-2">
          {SUBSCRIPTION_PRESETS.map((p) => {
            const added = form.subscriptions.some((s) => s.label === p.label);
            return (
              <button
                key={p.label}
                onClick={() => addPreset(p)}
                disabled={added}
                className={cn(
                  'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] ring-1 ring-inset transition-all',
                  added
                    ? 'bg-neon-mint/15 ring-neon-mint/30 text-neon-mint'
                    : 'bg-white/[0.025] ring-white/[0.06] text-zinc-300 hover:bg-white/[0.06]',
                )}
                style={
                  !added
                    ? { boxShadow: `inset 0 0 0 1px ${p.hue}25` }
                    : undefined
                }
              >
                {added ? <Check className="h-3 w-3" /> : <Plus className="h-3 w-3" />}
                <span>{p.label}</span>
                <span className="num-display text-zinc-500 ml-0.5">
                  {p.amount}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {form.subscriptions.length > 0 && (
        <div className="space-y-2">
          <AnimatePresence initial={false}>
            {form.subscriptions.map((sub) => (
              <motion.div
                key={sub.id}
                layout
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.22 }}
                className="flex items-center gap-2 rounded-xl bg-white/[0.03] ring-1 ring-inset ring-white/[0.06] p-2"
              >
                <input
                  value={sub.label}
                  onChange={(e) => update(sub.id, { label: e.target.value })}
                  placeholder="Netflix"
                  className="flex-1 min-w-0 bg-transparent px-2 py-1.5 text-sm outline-none placeholder:text-zinc-600"
                />
                <MoneyInput
                  value={sub.amount}
                  onChange={(v) => update(sub.id, { amount: v })}
                  placeholder="0"
                  className="w-24 text-right bg-transparent px-2 py-1.5 text-sm outline-none placeholder:text-zinc-700"
                />
                <IconButton tone="coral" onClick={() => remove(sub.id)}>
                  <Trash2 className="h-3.5 w-3.5" />
                </IconButton>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      <button
        onClick={addCustom}
        className="w-full rounded-xl border border-dashed border-white/10 hover:border-white/20 hover:bg-white/[0.02] py-2.5 text-xs text-zinc-400 hover:text-zinc-200 transition-all flex items-center justify-center gap-2"
      >
        <Plus className="h-3.5 w-3.5" />
        Abonnement personnalisé
      </button>
    </div>
  );
}

// ---------- Step 5: Recap ----------
function StepRecap({
  form,
  setForm,
  totals,
  suggested,
  onTouchThresholds,
}: {
  form: OnboardingForm;
  setForm: SetForm;
  totals: { inflow: number; outflow: number };
  suggested: { critical: number; warning: number; comfortable: number };
  onTouchThresholds: () => void;
}) {
  const projected = useMemo(() => {
    return form.openingBalance + (totals.inflow - totals.outflow);
  }, [form.openingBalance, totals]);

  const surplus = totals.inflow - totals.outflow;

  return (
    <div className="space-y-5">
      <div className="rounded-2xl bg-white/[0.025] ring-1 ring-inset ring-white/[0.06] p-4">
        <div className="text-[10px] uppercase tracking-[0.18em] text-zinc-500 mb-2 flex items-center gap-2">
          <Receipt className="h-3 w-3" />
          Aperçu mensuel
        </div>
        <div className="grid grid-cols-3 gap-3">
          <Stat label="Entrées" tone="mint">
            <Money amount={totals.inflow} compact />
          </Stat>
          <Stat label="Sorties" tone="coral">
            <Money amount={-totals.outflow} compact />
          </Stat>
          <Stat label="Marge" tone={surplus >= 0 ? 'mint' : 'coral'}>
            <Money amount={surplus} compact signDisplay="always" />
          </Stat>
        </div>
        <div className="mt-3 pt-3 border-t border-white/5 flex items-baseline justify-between">
          <span className="text-xs text-zinc-500">
            Projection à J+30 (estimation)
          </span>
          <Money
            amount={projected}
            className={cn(
              'num-display text-xl font-semibold',
              projected < form.thresholds.warning && 'text-neon-coral',
              projected >= form.thresholds.comfortable && 'text-neon-mint',
            )}
          />
        </div>
      </div>

      <div>
        <div className="flex items-baseline justify-between mb-2">
          <Label>Seuils de stress financier</Label>
          <button
            onClick={() => {
              setForm((f) => ({ ...f, thresholds: suggested }));
              onTouchThresholds();
            }}
            className="text-[11px] uppercase tracking-[0.14em] text-neon-violet hover:text-neon-violet/80"
          >
            Suggéré
          </button>
        </div>
        <div className="space-y-2">
          <ThresholdRow
            tone="coral"
            label="Critique"
            value={form.thresholds.critical}
            currency={form.currency}
            onChange={(v) => {
              setForm((f) => ({
                ...f,
                thresholds: { ...f.thresholds, critical: v },
              }));
              onTouchThresholds();
            }}
          />
          <ThresholdRow
            tone="amber"
            label="Vigilance"
            value={form.thresholds.warning}
            currency={form.currency}
            onChange={(v) => {
              setForm((f) => ({
                ...f,
                thresholds: { ...f.thresholds, warning: v },
              }));
              onTouchThresholds();
            }}
          />
          <ThresholdRow
            tone="mint"
            label="Confort"
            value={form.thresholds.comfortable}
            currency={form.currency}
            onChange={(v) => {
              setForm((f) => ({
                ...f,
                thresholds: { ...f.thresholds, comfortable: v },
              }));
              onTouchThresholds();
            }}
          />
        </div>
      </div>

      <p className="text-[11px] text-zinc-500">
        Tout est sauvegardé localement dans ton navigateur. Tu pourras tout
        modifier ensuite depuis le tableau de bord.
      </p>
    </div>
  );
}

function ThresholdRow({
  tone,
  label,
  value,
  currency,
  onChange,
}: {
  tone: 'coral' | 'amber' | 'mint';
  label: string;
  value: number;
  currency: string;
  onChange: (v: number) => void;
}) {
  const dotClass =
    tone === 'coral'
      ? 'bg-neon-coral shadow-glow-coral'
      : tone === 'amber'
        ? 'bg-neon-amber'
        : 'bg-neon-mint shadow-glow-mint';
  return (
    <div className="flex items-center gap-3 rounded-xl bg-white/[0.025] ring-1 ring-inset ring-white/[0.06] px-3 py-2">
      <span className={cn('h-2 w-2 rounded-full', dotClass)} />
      <span className="text-xs text-zinc-300 w-20">{label}</span>
      <MoneyInput
        value={value}
        onChange={onChange}
        className="num-display flex-1 bg-transparent text-right text-sm outline-none"
      />
      <span className="text-[11px] text-zinc-500">{currency}</span>
    </div>
  );
}

function Stat({
  label,
  tone,
  children,
}: {
  label: string;
  tone: 'mint' | 'coral';
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-[10px] uppercase tracking-[0.14em] text-zinc-500">
        {label}
      </span>
      <span
        className={cn(
          'num-display text-lg font-semibold',
          tone === 'mint' && 'text-neon-mint',
          tone === 'coral' && 'text-neon-coral',
        )}
      >
        {children}
      </span>
    </div>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return (
    <label className="text-[10px] uppercase tracking-[0.18em] text-zinc-500 font-medium">
      {children}
    </label>
  );
}
