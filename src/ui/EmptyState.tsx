import type { ReactNode } from 'react';

export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
      {icon && (
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/[0.03] text-zinc-500 ring-1 ring-white/5">
          {icon}
        </div>
      )}
      <div>
        <p className="text-sm font-medium text-zinc-300">{title}</p>
        {description && <p className="mt-1 text-xs text-zinc-500">{description}</p>}
      </div>
      {action}
    </div>
  );
}
