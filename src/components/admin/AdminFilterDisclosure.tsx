"use client";

import { useState } from "react";
import { SlidersHorizontal } from "lucide-react";

/**
 * Folds the filter dropdowns away on a phone.
 *
 * The product list carries a search box, six selects and a submit button in one
 * wrapping row. On a desktop that is one line; on a 400px screen it is six, so
 * the first product sat below the fold behind controls nobody had asked for.
 *
 * The selects stay in the document when the panel is shut — `hidden` is
 * display:none, and a display:none field is still submitted — so folding them
 * away never silently drops a filter the URL is already carrying. That is also
 * why the button says how many are set: a closed panel must not hide the fact
 * that the list is filtered.
 *
 * `sm:contents` above the breakpoint makes this wrapper transparent, so the
 * selects lay out in the form's own flex row exactly as they did before.
 */
export function AdminFilterDisclosure({
  activeCount,
  children,
}: {
  /** How many of the wrapped filters currently hold a value. */
  activeCount: number;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className={`inline-flex h-11 items-center gap-1.5 rounded-xl border px-3.5 text-sm font-semibold transition-colors sm:hidden ${
          activeCount > 0
            ? "border-brand-500 bg-brand-50 text-brand-800"
            : "border-ink-900/10 bg-white text-ink-700"
        }`}
      >
        <SlidersHorizontal className="size-4" aria-hidden />
        Filtra
        {activeCount > 0 && (
          <span className="rounded-full bg-brand-600 px-1.5 text-[11px] font-bold text-white">
            {activeCount}
          </span>
        )}
      </button>

      <div
        className={`${open ? "flex w-full flex-wrap gap-2" : "hidden"} sm:contents`}
      >
        {children}
      </div>
    </>
  );
}
