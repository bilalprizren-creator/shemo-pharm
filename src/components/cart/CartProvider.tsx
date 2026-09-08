"use client";

import { createContext, useCallback, useContext, useState, useSyncExternalStore } from "react";

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

/**
 * Puts a whole basket back.
 *
 * Emptying is the one basket action with nothing to undo it and nothing to
 * restore from — the lines live in localStorage and nowhere else, so a forty-
 * line wholesale basket lost to a mis-tap is lost. The confirm step in
 * ClearCartButton is the first guard; this is the second.
 *
 * Replaces rather than merges: it is only ever called with a snapshot taken a
 * few seconds earlier, and anything added since should not survive the undo of
 * the clear that came after it.
 */
function restoreCart(lines: CartLine[]): void {
  persist(lines.filter((l) => l.qty > 0).slice(0, 200));
}

/**
 * Another tab changed the basket: drop the memo so the next snapshot re-reads
 * localStorage. Without this the two tabs drift apart and whichever writes
 * last overwrites the other's lines. (key === null means storage was cleared.)
 */
function onStorage(e: StorageEvent): void {
  if (e.key !== null && e.key !== STORAGE_KEY) return;
  cache = null;
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void): () => void {
  if (listeners.size === 0) window.addEventListener("storage", onStorage);
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) window.removeEventListener("storage", onStorage);
  };
}

/** The last product added by name, for the confirmation toast. `seq` makes a
 *  second add of the same product a new notification rather than a no-op. */
export interface CartNotice {
  name: string;
  seq: number;
}

interface CartContextValue {
  lines: CartLine[];
  count: number;
  /** `name` is optional and only drives the toast — bulk adds pass none. */
  add: (id: number, qty?: number, name?: string) => void;
  /** A whole list at once — a reorder, or a wishlist taken to the basket. */
  addLines: (batch: { id: number; qty: number }[]) => void;
  setQty: (id: number, qty: number) => void;
  remove: (id: number) => void;
  clear: () => void;
  /** Puts a snapshot back — see restoreCart. */
  restore: (lines: CartLine[]) => void;
  ready: boolean;
  /** Side panel state — the basket opens next to the page, not as a new one. */
  open: boolean;
  openCart: () => void;
  closeCart: () => void;
  notice: CartNotice | null;
  dismissNotice: () => void;
}

const CartContext = createContext<CartContextValue>({
  lines: EMPTY,
  count: 0,
  add: () => {},
  addLines: () => {},
  setQty: () => {},
  remove: () => {},
  clear: () => {},
  restore: () => {},
  ready: false,
  open: false,
  openCart: () => {},
  closeCart: () => {},
  notice: null,
  dismissNotice: () => {},
});

export function CartProvider({ children }: { children: React.ReactNode }) {
  const lines = useSyncExternalStore(subscribe, readLines, () => EMPTY);
  const ready = useSyncExternalStore(
    subscribe,
    () => true,
    () => false
  );
  const [open, setOpen] = useState(false);
  const openCart = useCallback(() => setOpen(true), []);
  const closeCart = useCallback(() => setOpen(false), []);

  const [notice, setNotice] = useState<CartNotice | null>(null);
  const dismissNotice = useCallback(() => setNotice(null), []);
  const add = useCallback((id: number, qty = 1, name?: string) => {
    addLine(id, qty);
    if (name) setNotice((prev) => ({ name, seq: (prev?.seq ?? 0) + 1 }));
  }, []);

  /**
   * A whole list into the basket at once.
   *
   * Reordering a past order and taking a wishlist through to an order are the
   * same gesture with two names, and both were a loop written at the call site.
   * Adds rather than replaces: somebody halfway through a new basket must not
   * lose it by pressing either one. No toast — the drawer opening is the
   * feedback, and one per line would be a stack of them.
   */
  const addLines = useCallback((batch: { id: number; qty: number }[]) => {
    for (const line of batch) addLine(line.id, line.qty);
  }, []);

  const count = lines.reduce((sum, l) => sum + l.qty, 0);

  return (
    <CartContext.Provider
      value={{
        lines,
        count,
        add,
        addLines,
        setQty,
        remove: removeLine,
        clear: clearCart,
        restore: restoreCart,
        ready,
        open,
        openCart,
        closeCart,
        notice,
        dismissNotice,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  return useContext(CartContext);
}
