"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { Search, X, Loader2, PackageSearch } from "lucide-react";
import type { PublicProduct } from "@/lib/types";

interface SearchBarProps {
  /** Autofocus the input when rendered (used inside the mobile sheet). */
  autoFocus?: boolean;
  /** Called after a result or the full-search action is chosen. */
  onNavigate?: () => void;
  className?: string;
}

export function SearchBar({ autoFocus, onNavigate, className }: SearchBarProps) {
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

  const close = useCallback(() => {
    setOpen(false);
    setActive(-1);
  }, []);

  // Debounced suggestions
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const q = query.trim();
    if (q.length < 2) {
      setResults([]);
      setTotal(0);
      setLoading(false);
      return;
    }
    setLoading(true);
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/kerko?q=${encodeURIComponent(q)}`);
        const data = (await res.json()) as { items: PublicProduct[]; total: number };
        setResults(data.items);
        setTotal(data.total);
        setOpen(true);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 250);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query]);

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
    router.push(`/produktet?kerko=${encodeURIComponent(q)}`);
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
        router.push(`/produktet/${results[active].slug}`);
      } else {
        goToFullSearch();
      }
    }
  };

  return (
    <div ref={rootRef} className={`relative ${className ?? ""}`}>
      <div className="relative">
        <Search
          aria-hidden
          className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4.5 text-ink-400"
        />
        <input
          ref={inputRef}
          type="search"
          role="combobox"
          aria-expanded={open && results.length > 0}
          aria-controls="kerko-sugjerimet"
          aria-autocomplete="list"
          aria-label="Kërko produkte"
          placeholder="Kërko produkte, kode ose kategori…"
          autoFocus={autoFocus}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => results.length > 0 && setOpen(true)}
          onKeyDown={onKeyDown}
          className="w-full h-11 rounded-full border border-ink-900/10 bg-white pl-10 pr-16 text-sm text-ink-900 placeholder:text-ink-400 shadow-none focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/25 [&::-webkit-search-cancel-button]:hidden"
        />
        <div className="absolute right-2 top-1/2 flex -translate-y-1/2 items-center gap-1">
          {loading && (
            <Loader2 aria-hidden className="size-4 animate-spin text-brand-600" />
          )}
          {query && (
            <button
              type="button"
              onClick={() => {
                setQuery("");
                setResults([]);
                close();
                inputRef.current?.focus();
              }}
              aria-label="Pastro kërkimin"
              className="flex size-8 items-center justify-center rounded-full text-ink-400 hover:bg-ink-900/5 hover:text-ink-700"
            >
              <X className="size-4" aria-hidden />
            </button>
          )}
        </div>
      </div>

      {open && query.trim().length >= 2 && (
        <div
          id="kerko-sugjerimet"
          role="listbox"
          aria-label="Sugjerime kërkimi"
          className="absolute left-0 right-0 top-full z-50 mt-2 overflow-hidden rounded-2xl border border-ink-900/8 bg-white shadow-drawer"
        >
          {results.length === 0 && !loading ? (
            <div className="flex items-center gap-3 px-4 py-5 text-sm text-ink-500">
              <PackageSearch className="size-5 shrink-0 text-ink-300" aria-hidden />
              Asnjë produkt nuk u gjet për &ldquo;{query.trim()}&rdquo;
            </div>
          ) : (
            <>
              <ul className="max-h-88 overflow-y-auto py-1.5">
                {results.map((p, i) => (
                  <li key={p.id} role="option" aria-selected={i === active}>
                    <Link
                      href={`/produktet/${p.slug}`}
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
                          {[p.sku && `Kodi: ${p.sku}`, p.categoryName]
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
                Shiko të gjitha rezultatet ({total})
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
