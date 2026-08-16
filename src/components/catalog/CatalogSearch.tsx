"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Search, X } from "lucide-react";

export interface CatalogSearchLabels {
  /** Accessible name for the field. */
  field: string;
  placeholder: string;
  submit: string;
  clear: string;
  /** "{n} products" — already formatted by the caller. */
  count: string;
  searching: string;
}

/**
 * Search-within-results for a listing page.
 *
 * Still a real `<form method="get">` pointing at the listing path, so it works
 * with JavaScript turned off exactly as it did before — the previous version
 * was only that, which is why nothing appeared to happen until Enter: there was
 * no button to press and no sign the navigation had started. The submit handler
 * upgrades it rather than replacing it, routing through `useTransition` so the
 * pending state is real and not a guess.
 *
 * The other filters travel as hidden fields so a search does not silently drop
 * the sort order or the in-stock filter; `faqja` is deliberately not carried,
 * because a new query starts at page one.
 */
export function CatalogSearch({
  action,
  defaultValue,
  hidden,
  labels,
}: {
  /** Listing path this form submits to, language prefix included. */
  action: string;
  defaultValue: string;
  /** Filters to preserve across the search, as name/value pairs. */
  hidden: ReadonlyArray<{ name: string; value: string }>;
  labels: CatalogSearchLabels;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [value, setValue] = useState(defaultValue);
  const inputRef = useRef<HTMLInputElement>(null);

  const go = (next: string) => {
    const params = new URLSearchParams();
    if (next.trim()) params.set("kerko", next.trim());
    for (const { name, value: v } of hidden) params.set(name, v);
    const qs = params.toString();
    startTransition(() => router.push(qs ? `${action}?${qs}` : action));
  };

  return (
    <form
      action={action}
      method="get"
      role="search"
      className="flex min-w-0 flex-1 basis-72 items-center gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        go(value);
      }}
    >
      <div className="relative min-w-0 flex-1">
        <Search
          aria-hidden
          className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-ink-400"
        />
        <input
          ref={inputRef}
          type="search"
          name="kerko"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={labels.placeholder}
          aria-label={labels.field}
          className="h-10 w-full rounded-lg border border-ink-900/10 bg-white pl-10 pr-10 text-sm text-ink-900 placeholder:text-ink-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/25 [&::-webkit-search-cancel-button]:hidden"
        />
        {/* Hidden when there is nothing to clear, so the control never offers
            an action that would do nothing. */}
        {value !== "" && (
          <button
            type="button"
            onClick={() => {
              setValue("");
              inputRef.current?.focus();
              if (defaultValue !== "") go("");
            }}
            aria-label={labels.clear}
            className="absolute right-1 top-1/2 flex size-8 -translate-y-1/2 items-center justify-center rounded-md text-ink-400 transition-colors hover:bg-ink-900/5 hover:text-ink-700"
          >
            <X className="size-4" aria-hidden />
          </button>
        )}
      </div>

      {hidden.map((h) => (
        <input key={h.name} type="hidden" name={h.name} value={h.value} />
      ))}

      <button
        type="submit"
        className="flex h-10 shrink-0 items-center gap-1.5 rounded-lg bg-brand-600 px-4 text-sm font-semibold text-white transition-colors hover:bg-brand-700"
      >
        {pending ? (
          <Loader2 className="size-4 animate-spin" aria-hidden />
        ) : (
          <Search className="size-4 sm:hidden" aria-hidden />
        )}
        <span className="hidden sm:inline">{labels.submit}</span>
      </button>

      {/* The count sits with the field it describes rather than up beside the
          page heading, and is announced when it changes. */}
      <p
        aria-live="polite"
        className="hidden shrink-0 text-sm text-ink-400 sm:block"
      >
        {pending ? labels.searching : labels.count}
      </p>
    </form>
  );
}
