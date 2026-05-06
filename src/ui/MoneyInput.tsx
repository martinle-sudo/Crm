import { forwardRef, useEffect, useRef, useState } from 'react';
import type { InputHTMLAttributes } from 'react';
import { cn } from './cn';

interface MoneyInputProps
  extends Omit<
    InputHTMLAttributes<HTMLInputElement>,
    'value' | 'onChange' | 'type'
  > {
  value: number;
  onChange: (next: number) => void;
  /** When true, an empty input maps to undefined behavior is `onChange(0)`. */
  emptyAsZero?: boolean;
}

const ALLOWED = /^[\d]*[.,]?[\d]*$/;

/**
 * A controlled input that accepts decimals (cents) without stripping
 * trailing separators while typing. Internally it holds the raw string the
 * user typed and only emits a parsed number through `onChange`. External
 * value changes (e.g. preset clicks) sync back into the raw display.
 */
export const MoneyInput = forwardRef<HTMLInputElement, MoneyInputProps>(
  function MoneyInput(
    { value, onChange, emptyAsZero = true, className, ...rest },
    ref,
  ) {
    const [raw, setRaw] = useState<string>(value === 0 ? '' : String(value));
    const lastEmitted = useRef<number>(value);

    useEffect(() => {
      if (value !== lastEmitted.current) {
        setRaw(value === 0 ? '' : String(value));
        lastEmitted.current = value;
      }
    }, [value]);

    return (
      <input
        ref={ref}
        type="text"
        inputMode="decimal"
        autoComplete="off"
        value={raw}
        onChange={(e) => {
          const next = e.target.value;
          if (next !== '' && !ALLOWED.test(next)) return;
          setRaw(next);
          if (next === '' || next === '.' || next === ',') {
            const v = emptyAsZero ? 0 : NaN;
            lastEmitted.current = v;
            onChange(emptyAsZero ? 0 : 0);
            return;
          }
          const parsed = parseFloat(next.replace(',', '.'));
          if (!Number.isNaN(parsed)) {
            lastEmitted.current = parsed;
            onChange(parsed);
          }
        }}
        onBlur={(e) => {
          const parsed = parseFloat(raw.replace(',', '.'));
          if (Number.isNaN(parsed)) {
            setRaw('');
          } else {
            // Normalise display on blur (e.g. "1500." -> "1500", "10,50" -> "10.5")
            setRaw(String(parsed));
          }
          rest.onBlur?.(e);
        }}
        className={cn('num-display', className)}
        {...rest}
      />
    );
  },
);
