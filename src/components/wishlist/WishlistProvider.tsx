"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";

const STORAGE_KEY = "shemo-wishlist";

interface WishlistContextValue {
  ids: number[];
  count: number;
  has: (id: number) => boolean;
  toggle: (id: number) => void;
  ready: boolean;
}

const WishlistContext = createContext<WishlistContextValue>({
  ids: [],
  count: 0,
  has: () => false,
  toggle: () => {},
  ready: false,
});

export function WishlistProvider({ children }: { children: React.ReactNode }) {
  const [ids, setIds] = useState<number[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setIds(JSON.parse(raw).filter((n: unknown) => typeof n === "number"));
    } catch {
      // corrupted storage — start clean
    }
    setReady(true);
  }, []);

  const toggle = useCallback((id: number) => {
    setIds((prev) => {
      const next = prev.includes(id)
        ? prev.filter((x) => x !== id)
        : [...prev, id];
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {
        // storage unavailable (private mode) — keep in-memory state
      }
      return next;
    });
  }, []);

  const has = useCallback((id: number) => ids.includes(id), [ids]);

  return (
    <WishlistContext.Provider
      value={{ ids, count: ids.length, has, toggle, ready }}
    >
      {children}
    </WishlistContext.Provider>
  );
}

export function useWishlist() {
  return useContext(WishlistContext);
}
