import { nanoid } from 'nanoid';
import { Plus, Trash2 } from 'lucide-react';
import type { LineItem } from '@/domain/types';
import { Input } from '@/ui/Field';
import { Money } from '@/ui/Money';
import { computeTaxes, lineTotal } from '@/domain/quebec';

export function LineItemsEditor({
  lines,
  onChange,
}: {
  lines: LineItem[];
  onChange: (lines: LineItem[]) => void;
}) {
  const update = (id: string, patch: Partial<LineItem>) =>
    onChange(lines.map((l) => (l.id === id ? { ...l, ...patch } : l)));
  const add = () =>
    onChange([...lines, { id: nanoid(6), label: '', qty: 1, unitPrice: 0 }]);
  const remove = (id: string) => onChange(lines.filter((l) => l.id !== id));

  return (
    <div className="space-y-2">
      <div className="hidden grid-cols-[1fr_70px_90px_90px_32px] gap-2 px-1 text-[10px] uppercase tracking-wide text-zinc-600 sm:grid">
        <span>Description</span><span>Qté</span><span>Prix unit.</span><span>Total</span><span />
      </div>
      {lines.map((l) => (
        <div key={l.id} className="grid grid-cols-[1fr_70px_90px_90px_32px] items-center gap-2">
          <Input value={l.label} onChange={(e) => update(l.id, { label: e.target.value })} placeholder="Service…" />
          <Input type="number" value={l.qty} onChange={(e) => update(l.id, { qty: Number(e.target.value) })} />
          <Input type="number" value={l.unitPrice} onChange={(e) => update(l.id, { unitPrice: Number(e.target.value) })} />
          <Money amount={lineTotal(l)} className="text-right text-sm text-zinc-300" />
          <button onClick={() => remove(l.id)} className="text-zinc-600 hover:text-neon-coral">
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      ))}
      <button onClick={add} className="flex items-center gap-1.5 text-xs text-neon-violet hover:underline">
        <Plus className="h-3 w-3" /> Ajouter une ligne
      </button>
    </div>
  );
}

export function TaxSummary({
  lines,
  gstRate,
  qstRate,
}: {
  lines: LineItem[];
  gstRate: number;
  qstRate: number;
}) {
  const t = computeTaxes(lines, gstRate, qstRate);
  return (
    <div className="ml-auto w-full max-w-[260px] space-y-1.5 rounded-xl bg-white/[0.03] p-3 text-sm">
      <Row label="Sous-total" value={<Money amount={t.subtotal} />} />
      <Row label={`TPS (${(gstRate * 100).toFixed(0)} %)`} value={<Money amount={t.gst} />} />
      <Row label={`TVQ (${(qstRate * 100).toFixed(3)} %)`} value={<Money amount={t.qst} />} />
      <div className="border-t border-white/10 pt-1.5">
        <Row label="Total" value={<Money amount={t.total} className="font-semibold text-zinc-100" />} strong />
      </div>
    </div>
  );
}

function Row({ label, value, strong }: { label: string; value: React.ReactNode; strong?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className={strong ? 'text-zinc-200' : 'text-zinc-500'}>{label}</span>
      <span className="text-zinc-300">{value}</span>
    </div>
  );
}
