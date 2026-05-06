import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { cn } from './cn';

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  tone?: 'neutral' | 'violet' | 'coral' | 'mint';
}

const toneClasses: Record<NonNullable<IconButtonProps['tone']>, string> = {
  neutral: 'hover:bg-white/10 text-zinc-300',
  violet: 'hover:bg-neon-violet/15 text-neon-violet',
  coral: 'hover:bg-neon-coral/15 text-neon-coral',
  mint: 'hover:bg-neon-mint/15 text-neon-mint',
};

export function IconButton({
  className,
  children,
  tone = 'neutral',
  ...rest
}: IconButtonProps) {
  return (
    <button
      type="button"
      className={cn(
        'inline-flex h-8 w-8 items-center justify-center rounded-xl border border-white/5 bg-white/[0.02] transition-colors',
        toneClasses[tone],
        className,
      )}
      {...rest}
    >
      {children}
    </button>
  );
}
