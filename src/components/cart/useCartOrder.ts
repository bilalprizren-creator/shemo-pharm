"use client";

import { useEffect, useMemo, useState } from "react";
import { SITE } from "@/lib/site";
import type { CardProduct } from "@/lib/types";
import type { Dictionary } from "@/lib/dictionaries";
import { useCart } from "./CartProvider";
import { logOrderAction } from "@/lib/order-actions";

/**
 * Everything the basket needs to turn stored lines into a sendable order.
 * The side panel and the full /shporta page both read from here so the two
 * can never disagree about a total or an order text.
 */

/** Parses "12,34 €" (server-formatted) back to cents for the local total. */
export function priceToCents(price: string): number {
  const m = price.match(/(\d+),(\d{2})/);
  return m ? Number(m[1]) * 100 + Number(m[2]) : 0;
}

export function formatCents(cents: number): string {
  return `${(cents / 100).toFixed(2).replace(".", ",")} €`;
}

/**
 * Resolves the stored line ids into full products. `items` is null while the
 * lookup is in flight and [] once an empty basket is known — the two states
 * read the same in JSX but only the second may render "your cart is empty".
 */
export function useCartItems(): {
  items: CardProduct[] | null;
  error: boolean;
  ready: boolean;
} {
  const { lines, ready } = useCart();
  const [items, setItems] = useState<CardProduct[] | null>(null);
  const [error, setError] = useState(false);

  const ids = useMemo(() => lines.map((l) => l.id), [lines]);

  useEffect(() => {
    if (!ready || ids.length === 0) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/lista?ids=${ids.join(",")}`);
        if (!res.ok) throw new Error();
        const data = (await res.json()) as { items: CardProduct[] };
        if (!cancelled) setItems(data.items);
      } catch {
        if (!cancelled) setError(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [ids, ready]);

  return { items: ready && ids.length === 0 ? [] : items, error, ready };
}

export interface CartOrder {
  qtyOf: (id: number) => number;
  totalQty: number;
  pricesVisible: boolean;
  totalCents: number;
  whatsappHref: string;
  mailHref: string;
  /** Mirrors the order into the DB as the external app opens. */
  logOrder: (channel: "whatsapp" | "email") => void;
}

export function useCartOrder(items: CardProduct[], dict: Dictionary): CartOrder {
  const { lines } = useCart();

  const qtyOf = (id: number) => lines.find((l) => l.id === id)?.qty ?? 1;
  const pricesVisible = items.length > 0 && items.every((p) => p.price !== null);
  const totalCents = pricesVisible
    ? items.reduce((sum, p) => sum + priceToCents(p.price as string) * qtyOf(p.id), 0)
    : 0;

  const orderLines = items
    .map(
      (p, i) =>
        `${i + 1}. ${p.name}${p.sku ? ` (${dict.common.code}: ${p.sku})` : ""} — ${qtyOf(p.id)} ${dict.common.piece}`
    )
    .join("\n");
  const orderText = `${dict.cartPage.orderGreeting}\n\n${orderLines}\n\n${dict.cartPage.orderClosing}`;

  return {
    qtyOf,
    totalQty: lines.reduce((sum, l) => sum + l.qty, 0),
    pricesVisible,
    totalCents,
    whatsappHref: `${SITE.whatsapp}?text=${encodeURIComponent(orderText)}`,
    mailHref: `mailto:${SITE.emails[0]}?subject=${encodeURIComponent(
      dict.cartPage.orderMailSubject
    )}&body=${encodeURIComponent(orderText)}`,
    // Fire-and-forget: a logging failure must never stop the customer from
    // sending the WhatsApp/email itself.
    logOrder: (channel) => {
      logOrderAction({
        channel,
        lines: lines.map((l) => ({ id: l.id, qty: l.qty })),
      }).catch(() => {});
    },
  };
}
