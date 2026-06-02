import type {
  ReactNode,
  InputHTMLAttributes,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from 'react';
import { cn } from './cn';

const baseInput =
  'w-full rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-zinc-100 ' +
  'placeholder:text-zinc-600 outline-none transition-colors focus:border-neon-violet/50 focus:bg-white/[0.05]';

export function Field({
  label,
  hint,
  children,
  className,
}: {
  label?: ReactNode;
  hint?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <label className={cn('flex flex-col gap-1.5', className)}>
      {label && (
        <span className="text-[11px] uppercase tracking-[0.14em] text-zinc-500 font-medium">
          {label}
        </span>
      )}
      {children}
      {hint && <span className="text-[11px] text-zinc-600">{hint}</span>}
    </label>
  );
}

export function Input({ className, ...rest }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn(baseInput, className)} {...rest} />;
}

export function Textarea({ className, ...rest }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={cn(baseInput, 'resize-none', className)} rows={3} {...rest} />;
}

export function Select({
  className,
  children,
  ...rest
}: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select className={cn(baseInput, 'appearance-none cursor-pointer', className)} {...rest}>
      {children}
    </select>
  );
}
