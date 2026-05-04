import type { ReactNode } from 'react';
import { cn } from './cn';

interface PillProps {
  tone?: 'neutral' | 'violet' | 'cyan' | 'mint' | 'coral' | 'amber';
  children: ReactNode;
  className?: string;
}

const toneClasses: Record<NonNullable<PillProps['tone']>, string> = {
  neutral: 'bg-white/5 text-zinc-300 ring-white/10',
  violet: 'bg-neon-violet/10 text-neon-violet ring-neon-violet/30',
  cyan: 'bg-neon-cyan/10 text-neon-cyan ring-neon-cyan/30',
  mint: 'bg-neon-mint/10 text-neon-mint ring-neon-mint/30',
  coral: 'bg-neon-coral/10 text-neon-coral ring-neon-coral/30',
  amber: 'bg-neon-amber/10 text-neon-amber ring-neon-amber/30',
};

export function Pill({ tone = 'neutral', children, className }: PillProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[10px] uppercase tracking-[0.14em] font-medium ring-1 ring-inset',
        toneClasses[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}
