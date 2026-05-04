import type { ReactNode } from 'react';
import { cn } from './cn';

interface StatProps {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  className?: string;
}

export function Stat({ label, value, hint, className }: StatProps) {
  return (
    <div className={cn('flex flex-col gap-1', className)}>
      <span className="text-[10px] uppercase tracking-[0.18em] text-zinc-500 font-medium">
        {label}
      </span>
      <span className="num-display text-2xl font-semibold text-zinc-100">
        {value}
      </span>
      {hint && <span className="text-xs text-zinc-500">{hint}</span>}
    </div>
  );
}
