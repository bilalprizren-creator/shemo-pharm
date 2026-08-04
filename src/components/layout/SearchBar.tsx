"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { Search, X, Loader2, PackageSearch } from "lucide-react";
import type { PublicProduct } from "@/lib/types";
import { langHref, fmt, type Lang } from "@/lib/i18n";
import type { Dictionary } from "@/lib/dictionaries";

interface SearchBarProps {
  lang: Lang;
  dict: Dictionary;
  /** Autofocus the input when rendered (used inside the overlay/sheet). */
  autoFocus?: boolean;
  /** Called after a result or the full-search action is chosen. */
  onNavigate?: () => void;
  /** Renders an attached submit button (desktop header style). */
  withButton?: boolean;
  className?: string;
}

export function SearchBar({
  lang,
  dict,
  autoFocus,
  onNavigate,
  withButton = false,
  className,
}: SearchBarProps) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<PublicProduct[]>([]);
  const [total, setTotal] = useState(0);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [active, setActive] = useState(-1);
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const close = useCallback(() => {
    setOpen(false);
    setActive(-1);
  }, []);

  // Debounced suggestions — driven by the change handler, not an effect
  const updateQuery = useCallback(
    (value: string) => {
      setQuery(value);
      if (debounceRef.current) clearTimeout(debounceRef.current);
      // A slower earlier request must never overwrite newer suggestions.
      abortRef.current?.abort();
      const q = value.trim();
      if (q.length < 2) {
        setResults([]);
        setTotal(0);
        setLoading(false);
        close();
        return;
      }
      setLoading(true);
      debounceRef.current = setTimeout(async () => {
        const controller = new AbortController();
        abortRef.current = controller;
        try {
          const res = await fetch(`/api/kerko?q=${encodeURIComponent(q)}`, {
            signal: controller.signal,
          });
          const data = (await res.json()) as { items: PublicProduct[]; total: number };
          setResults(data.items);
          setTotal(data.total);
          setOpen(true);
        } catch {
          if (controller.signal.aborted) return; // superseded by a newer query
          setResults([]);
        } finally {
          if (!controller.signal.aborted) setLoading(false);
        }
      }, 250);
    },
    [close]
  );

  // Clear any pending request timer and in-flight request on unmount
  useEffect(
    () => () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      abortRef.current?.abort();
    },
    []
  );

  // Close when clicking outside
  useEffect(() => {
    const handler = (e: PointerEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) close();
    };
    document.addEventListener("pointerdown", handler);
    return () => document.removeEventListener("pointerdown", handler);
  }, [close]);

  const goToFullSearch = () => {
    const q = query.trim();
    if (!q) return;
    close();
    onNavigate?.();
    router.push(`${langHref(lang, "/produktet")}?kerko=${encodeURIComponent(q)}`);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      close();
      return;
    }
    if (e.key === "ArrowDown" && results.length > 0) {
      e.preventDefault();
      setOpen(true);
      setActive((a) => (a + 1) % results.length);
    } else if (e.key === "ArrowUp" && results.length > 0) {
      e.preventDefault();
      setActive((a) => (a <= 0 ? results.length - 1 : a - 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (active >= 0 && results[active]) {
        close();
        onNavigate?.();
        router.push(langHref(lang, `/produktet/${results[active].slug}`));
      } else {
        goToFullSearch();
      }
    }
  };

  return (
    <div ref={rootRef} className={`relative ${className ?? ""}`}>
      {/* One borderless pill carries the fill, shadow and focus ring; the submit
          button is a second pill inset inside it, so both of its ends stay
          round. Laying the row out with flex also keeps the spinner and the
          clear button clear of the button without hand-tuned offsets.
          With no hairline, the shadow alone has to separate the white field
          from the white panel behind it — hence card-hover rather than card. */}
      <div
        className={`group flex h-13 items-center gap-1 rounded-full bg-white pl-4 shadow-card-hover transition focus-within:shadow-float focus-within:ring-4 focus-within:ring-brand-500/15 ${
          withButton ? "pr-1.5" : "pr-2"
        }`}
      >
        <Search
          aria-hidden
          className="size-5 shrink-0 text-ink-400 transition-colors group-focus-within:text-brand-600"
        />
        <input
          ref={inputRef}
          type="search"
          role="combobox"
          aria-expanded={open && results.length > 0}
          aria-controls="kerko-sugjerimet"
          aria-autocomplete="list"
          aria-label={dict.search.label}
          placeholder={dict.search.placeholder}
          autoFocus={autoFocus}
          value={query}
          onChange={(e) => updateQuery(e.target.value)}
          onFocus={() => results.length > 0 && setOpen(true)}
          onKeyDown={onKeyDown}
          // outline-none! — the site-wide :focus-visible outline in globals.css
          // is unlayered, so it beats any Tailwind utility no matter the
          // specificity, and would draw a rectangle inside the pill. The
          // wrapper's focus-within ring is this field's focus indicator.
          className="h-full min-w-0 flex-1 bg-transparent px-2 text-sm text-ink-900 outline-none! placeholder:text-ink-400 [&::-webkit-search-cancel-button]:hidden"
        />
        {loading && (
          <Loader2 aria-hidden className="size-4 shrink-0 animate-spin text-brand-600" />
        )}
        {query && (
          <button
            type="button"
            onClick={() => {
              updateQuery("");
              inputRef.current?.focus();
            }}
            aria-label={dict.search.clear}
            className="flex size-8 shrink-0 items-center justify-center rounded-full text-ink-400 transition-colors hover:bg-ink-900/5 hover:text-ink-700"
          >
            <X className="size-4" aria-hidden />
          </button>
        )}
        {withButton && (
          <button
            type="button"
            onClick={goToFullSearch}
            className="h-10 shrink-0 rounded-full bg-brand-600 px-4 text-sm font-semibold text-white transition-colors hover:bg-brand-700 sm:px-5"
          >
            {dict.search.button}
          </button>
        )}
      </div>

      {open && query.trim().length >= 2 && (
        <div
          id="kerko-sugjerimet"
          role="listbox"
          aria-label={dict.search.suggestionsLabel}
          className="absolute left-0 right-0 top-full z-50 mt-2.5 overflow-hidden rounded-3xl border border-ink-900/8 bg-white shadow-drawer"
        >
          {results.length === 0 && !loading ? (
            <div className="flex items-center gap-3 px-4 py-5 text-sm text-ink-500">
              <PackageSearch className="size-5 shrink-0 text-ink-300" aria-hidden />
              {fmt(dict.search.noResults, { q: query.trim() })}
            </div>
          ) : (
            <>
              <ul className="max-h-88 overflow-y-auto py-1.5">
                {results.map((p, i) => (
                  <li key={p.id} role="option" aria-selected={i === active}>
                    <Link
                      href={langHref(lang, `/produktet/${p.slug}`)}
                      onClick={() => {
                        close();
                        onNavigate?.();
                      }}
                      className={`flex items-center gap-3 px-3.5 py-2.5 text-sm transition-colors ${
                        i === active ? "bg-brand-50" : "hover:bg-brand-50"
                      }`}
                    >
                      <span className="relative flex size-11 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-ink-900/6 bg-white">
                        {p.image ? (
                          <Image
                            src={p.image}
                            alt=""
                            fill
                            sizes="44px"
                            className="object-contain p-1"
                          />
                        ) : (
                          <PackageSearch className="size-5 text-ink-300" aria-hidden />
                        )}
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate font-medium text-ink-900">
                          {p.name}
                        </span>
                        <span className="block truncate text-xs text-ink-400">
                          {[p.sku && `${dict.common.code}: ${p.sku}`, p.categoryName]
                            .filter(Boolean)
                            .join(" · ")}
                        </span>
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
              <button
                type="button"
                onClick={goToFullSearch}
                className="block w-full border-t border-ink-900/6 bg-surface px-4 py-3 text-center text-sm font-semibold text-brand-700 hover:bg-brand-50"
              >
                {fmt(dict.search.viewAllResults, { total })}
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
