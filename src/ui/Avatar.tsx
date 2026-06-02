import { cn } from './cn';

const palette = [
  'from-neon-violet/30 to-neon-cyan/30 text-neon-violet',
  'from-neon-cyan/30 to-neon-mint/30 text-neon-cyan',
  'from-neon-mint/30 to-neon-amber/30 text-neon-mint',
  'from-neon-coral/30 to-neon-violet/30 text-neon-coral',
  'from-neon-amber/30 to-neon-coral/30 text-neon-amber',
];

const hash = (s: string) => {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) % palette.length;
  return Math.abs(h);
};

export function Avatar({
  name,
  size = 'md',
  className,
}: {
  name: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}) {
  const initials = name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('');
  return (
    <div
      className={cn(
        'flex items-center justify-center rounded-2xl bg-gradient-to-br font-semibold ring-1 ring-white/10',
        palette[hash(name)],
        size === 'sm' && 'h-8 w-8 text-[11px]',
        size === 'md' && 'h-10 w-10 text-sm',
        size === 'lg' && 'h-14 w-14 text-lg',
        className,
      )}
    >
      {initials || '?'}
    </div>
  );
}
