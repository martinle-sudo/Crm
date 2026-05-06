import { useStore } from '@/store/useStore';
import { formatMoney } from '@/domain/format';
import { cn } from './cn';

interface MoneyProps {
  amount: number;
  className?: string;
  compact?: boolean;
  signDisplay?: 'auto' | 'always' | 'never';
  colorize?: boolean;
}

export function Money({
  amount,
  className,
  compact,
  signDisplay,
  colorize,
}: MoneyProps) {
  const profile = useStore((s) => s.profile);
  const blur = useStore((s) => s.preferences.privacy.blurAmounts);
  const text = formatMoney(amount, profile.locale, profile.currency, {
    compact,
    signDisplay,
  });
  return (
    <span
      className={cn(
        'tabular-nums',
        colorize && amount < 0 && 'text-neon-coral',
        colorize && amount > 0 && 'text-neon-mint',
        blur && 'blur-sm hover:blur-none transition-[filter] duration-300',
        className,
      )}
    >
      {text}
    </span>
  );
}
