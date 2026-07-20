"use client";

import { useRef, useState } from "react";

export const MAX_QTY = 999;

/**
 * Typeable quantity field for the +/− steppers. Wholesale orders run into the
 * hundreds, so the number has to be enterable directly instead of clicking
 * plus a hundred times.
 *
 * While the field has focus its value is kept as a raw string, so it can be
 * cleared and retyped without snapping back to 1 mid-edit. The number is
 * committed on every valid keystroke (totals stay live) and clamped on blur.
 */
export function QtyInput({
  value,
  onChange,
  label,
  className,
}: {
  value: number;
  onChange: (qty: number) => void;
  /** Localized aria-label, e.g. "Sasia". */
  label: string;
  className?: string;
}) {
  // Non-null only while editing; blur always clears it, so the +/− buttons
  // (which blur the field first) always see the committed value.
  const [draft, setDraft] = useState<string | null>(null);
  const ref = useRef<HTMLInputElement>(null);

  const commit = () => {
    const parsed = Number.parseInt(draft ?? "", 10);
    const next = Number.isNaN(parsed)
      ? value
      : Math.min(MAX_QTY, Math.max(1, parsed));
    setDraft(null);
    if (next !== value) onChange(next);
  };

  return (
    <input
      ref={ref}
      // Not type="number": that adds spinner arrows and lets invalid values
      // read back as "". inputMode gets the numeric keypad on mobile.
      type="text"
      inputMode="numeric"
      autoComplete="off"
      value={draft ?? String(value)}
      aria-label={label}
      onFocus={(e) => e.currentTarget.select()}
      onChange={(e) => {
        // Cap the length at the maximum's own digit count, so an over-long
        // number can never be typed in the first place.
        const digits = e.currentTarget.value
          .replace(/\D/g, "")
          .slice(0, String(MAX_QTY).length);
        setDraft(digits);
        const parsed = Number.parseInt(digits, 10);
        if (!Number.isNaN(parsed) && parsed >= 1) {
          onChange(Math.min(MAX_QTY, parsed));
        }
      }}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          ref.current?.blur();
        }
      }}
      className={`h-full min-w-0 border-0 bg-transparent text-center text-sm font-bold text-ink-900 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-brand-500/30 ${
        className ?? ""
      }`}
    />
  );
}
