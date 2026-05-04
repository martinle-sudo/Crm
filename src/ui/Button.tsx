import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { cn } from './cn';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  variant?: 'primary' | 'ghost' | 'soft';
  size?: 'sm' | 'md';
}

export function Button({
  className,
  children,
  variant = 'soft',
  size = 'md',
  ...rest
}: ButtonProps) {
  return (
    <button
      type="button"
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-xl font-medium transition-all',
        size === 'sm' && 'px-3 py-1.5 text-xs',
        size === 'md' && 'px-4 py-2 text-sm',
        variant === 'primary' &&
          'bg-neon-violet text-ink-950 hover:bg-neon-violet/90 shadow-glow-violet',
        variant === 'ghost' &&
          'text-zinc-400 hover:text-zinc-100 hover:bg-white/5',
        variant === 'soft' &&
          'bg-white/[0.04] text-zinc-200 ring-1 ring-inset ring-white/10 hover:bg-white/[0.08]',
        className,
      )}
      {...rest}
    >
      {children}
    </button>
  );
}
