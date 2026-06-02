import type { ReactNode } from 'react';
import { Search } from 'lucide-react';
import { cn } from './cn';

export function Toolbar({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('mb-5 flex flex-wrap items-center gap-3', className)}>{children}</div>
  );
}

export function SearchInput({
  value,
  onChange,
  placeholder = 'Rechercher…',
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <div className="relative flex-1 min-w-[200px]">
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-600" />
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-xl border border-white/10 bg-white/[0.03] py-2 pl-9 pr-3 text-sm text-zinc-100 placeholder:text-zinc-600 outline-none focus:border-neon-violet/50"
      />
    </div>
  );
}

export function FilterTabs<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div className="flex flex-wrap gap-1 rounded-xl bg-white/[0.03] p-1 ring-1 ring-inset ring-white/5">
      {options.map((o) => (
        <button
          key={o.value}
          onClick={() => onChange(o.value)}
          className={cn(
            'rounded-lg px-3 py-1.5 text-xs font-medium transition-colors',
            value === o.value
              ? 'bg-neon-violet/15 text-neon-violet'
              : 'text-zinc-400 hover:text-zinc-200',
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
