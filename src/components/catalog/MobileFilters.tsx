"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { SlidersHorizontal, X } from "lucide-react";

/**
 * Mobile filter sheet: a button that slides the (server-rendered)
 * category filter panel up from the bottom edge.
 */
export function MobileFilters({
  children,
  labels,
}: {
  children: React.ReactNode;
  labels: { filters: string; close: string };
}) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const closeRef = useRef<HTMLButtonElement>(null);

  // Close when navigation changes the route (category picked) —
  // state adjustment during render instead of an effect.
  const [prevPathname, setPrevPathname] = useState(pathname);
  if (prevPathname !== pathname) {
    setPrevPathname(pathname);
    setOpen(false);
  }

  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div className="lg:hidden">
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex min-h-10 items-center gap-2 rounded-lg border border-ink-900/10 bg-white px-3.5 py-2 text-sm font-medium text-ink-900 hover:border-brand-400"
      >
        <SlidersHorizontal className="size-4 text-brand-600" aria-hidden />
        {labels.filters}
      </button>

      {open && (
        <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label={labels.filters}>
          <button
            type="button"
            aria-label={labels.close}
            onClick={() => setOpen(false)}
            className="absolute inset-0 bg-ink-900/45"
            tabIndex={-1}
          />
          <div className="absolute inset-x-0 bottom-0 max-h-[80vh] overflow-y-auto rounded-t-3xl bg-white p-5 shadow-drawer">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-bold text-ink-900">{labels.filters}</h2>
              <button
                ref={closeRef}
                type="button"
                onClick={() => setOpen(false)}
                aria-label={labels.close}
                className="flex size-11 items-center justify-center rounded-full text-ink-700 hover:bg-ink-900/5"
              >
                <X className="size-5.5" aria-hidden />
              </button>
            </div>
            {children}
          </div>
        </div>
      )}
    </div>
  );
}
