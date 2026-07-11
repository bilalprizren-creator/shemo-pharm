"use client";

import {
  createContext,
  useCallback,
  useContext,
  useSyncExternalStore,
} from "react";

const STORAGE_KEY = "shemo-wishlist";
const EMPTY: number[] = [];

/**
 * Wishlist ids live in localStorage; useSyncExternalStore keeps SSR markup
 * stable (empty list) and swaps in the real data on the client.
 */
let cache: number[] | null = null;
const listeners = new Set<() => void>();

function readIds(): number[] {
  if (cache !== null) return cache;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    cache = Array.isArray(parsed)
      ? parsed.filter((n): n is number => typeof n === "number")
      : [];
  } catch {
    cache = [];
  }
  return cache;
}

function toggleId(id: number): void {
  const current = readIds();
  cache = current.includes(id)
    ? current.filter((x) => x !== id)
    : [...current, id];
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cache));
  } catch {
    // storage unavailable (private mode) — keep in-memory state
  }
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

interface WishlistContextValue {
  ids: number[];
  count: number;
  has: (id: number) => boolean;
  toggle: (id: number) => void;
  /** False during SSR/hydration, true once client data is live. */
  ready: boolean;
}

const WishlistContext = createContext<WishlistContextValue>({
  ids: EMPTY,
  count: 0,
  has: () => false,
  toggle: () => {},
  ready: false,
});

export function WishlistProvider({ children }: { children: React.ReactNode }) {
  const ids = useSyncExternalStore(subscribe, readIds, () => EMPTY);
  const ready = useSyncExternalStore(
    subscribe,
    () => true,
    () => false
  );

  const has = useCallback((id: number) => ids.includes(id), [ids]);

  return (
    <WishlistContext.Provider
      value={{ ids, count: ids.length, has, toggle: toggleId, ready }}
    >
      {children}
    </WishlistContext.Provider>
  );
}

export function useWishlist() {
  return useContext(WishlistContext);
}
