"use client";

import { createContext, useContext, useSyncExternalStore } from "react";

const STORAGE_KEY = "shemo-cart";

export interface CartLine {
  id: number;
  qty: number;
}

const EMPTY: CartLine[] = [];

/**
 * "Shporta" is an inquiry basket, not a checkout cart: it collects products
 * and quantities so the order can be sent to SHEMO PHARM via WhatsApp or
 * email. Lines live in localStorage; useSyncExternalStore keeps SSR markup
 * stable (empty) and swaps in real data on the client.
 */
let cache: CartLine[] | null = null;
const listeners = new Set<() => void>();

function readLines(): CartLine[] {
  if (cache !== null) return cache;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    cache = Array.isArray(parsed)
      ? parsed.filter(
          (l): l is CartLine =>
            typeof l === "object" &&
            l !== null &&
            typeof (l as CartLine).id === "number" &&
            typeof (l as CartLine).qty === "number" &&
            (l as CartLine).qty > 0
        )
      : [];
  } catch {
    cache = [];
  }
  return cache;
}

function persist(next: CartLine[]): void {
  cache = next;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // storage unavailable (private mode) — keep in-memory state
  }
  listeners.forEach((l) => l());
}

function addLine(id: number, qty = 1): void {
  const current = readLines();
  const existing = current.find((l) => l.id === id);
  persist(
    existing
      ? current.map((l) =>
          l.id === id ? { ...l, qty: Math.min(l.qty + qty, 999) } : l
        )
      : [...current, { id, qty: Math.min(qty, 999) }]
  );
}

function setQty(id: number, qty: number): void {
  const current = readLines();
  persist(
    qty <= 0
      ? current.filter((l) => l.id !== id)
      : current.map((l) => (l.id === id ? { ...l, qty: Math.min(qty, 999) } : l))
  );
}

function removeLine(id: number): void {
  persist(readLines().filter((l) => l.id !== id));
}

function clearCart(): void {
  persist([]);
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

interface CartContextValue {
  lines: CartLine[];
  count: number;
  add: (id: number, qty?: number) => void;
  setQty: (id: number, qty: number) => void;
  remove: (id: number) => void;
  clear: () => void;
  ready: boolean;
}

const CartContext = createContext<CartContextValue>({
  lines: EMPTY,
  count: 0,
  add: () => {},
  setQty: () => {},
  remove: () => {},
  clear: () => {},
  ready: false,
});

export function CartProvider({ children }: { children: React.ReactNode }) {
  const lines = useSyncExternalStore(subscribe, readLines, () => EMPTY);
  const ready = useSyncExternalStore(
    subscribe,
    () => true,
    () => false
  );

  const count = lines.reduce((sum, l) => sum + l.qty, 0);

  return (
    <CartContext.Provider
      value={{
        lines,
        count,
        add: addLine,
        setQty,
        remove: removeLine,
        clear: clearCart,
        ready,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  return useContext(CartContext);
}
