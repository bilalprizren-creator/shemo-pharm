"use client";

import { useEffect, useRef, useState } from "react";
import { SITE } from "@/lib/site";
import type { CardProduct } from "@/lib/types";
import type { Dictionary } from "@/lib/dictionaries";
import { useCart } from "./CartProvider";
import { logOrderAction, type OrderLogResult } from "@/lib/order-actions";

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

  /**
   * A string, because the effect below must not re-run for a quantity change.
   *
   * Every basket write rebuilds the array (CartProvider.persist maps over it),
   * so `lines` has a new identity after each one and memoizing on it holds
   * nothing. Pressing + on a line, or typing a quantity — QtyInput commits per
   * keystroke — used to fire one GET /api/lista each, against an endpoint
   * limited to 60 a minute: a customer adjusting a large basket could lock
   * themselves out of it. The ids are what the request depends on, so the ids
   * are what it watches.
   */
  const idKey = lines.map((l) => l.id).join(",");

  useEffect(() => {
    if (!ready || idKey === "") return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/lista?ids=${idKey}`);
        if (!res.ok) throw new Error();
        const data = (await res.json()) as { items: CardProduct[] };
        if (!cancelled) {
          setItems(data.items);
          // Cleared on success: one failed lookup used to leave the basket
          // showing its error state until the page was reloaded.
          setError(false);
        }
      } catch {
        if (!cancelled) setError(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [idKey, ready]);

  return { items: ready && idKey === "" ? [] : items, error, ready };
}

export interface CartOrder {
  /** The basket's products, filtered to the lines that are still in it. */
  lineItems: CardProduct[];
  qtyOf: (id: number) => number;
  /** The line's own money, which is what a wholesale buyer checks. */
  subtotalOf: (id: number) => number | null;
  totalQty: number;
  pricesVisible: boolean;
  totalCents: number;
  orderText: string;
  whatsappHref: string;
  mailHref: string;
  /**
   * Mirrors the order into the DB as the external app opens, and says whether
   * that worked. Called at most once per basket per channel — see `logOrder`.
   */
  logOrder: (channel: "whatsapp" | "email") => Promise<OrderLogResult>;
}

export function useCartOrder(items: CardProduct[], dict: Dictionary): CartOrder {
  const { lines } = useCart();

  /**
   * The products that are still in the basket.
   *
   * `items` is the last answer /api/lista gave, and removing a line refires
   * that request — so until it came back the removed product was still on
   * screen, and `qtyOf` fell through to 1 for it, which meant it also still
   * counted towards the total. Filtering against the lines makes removal
   * immediate and stops the total flickering through a value nobody chose.
   */
  const lineItems = items.filter((p) => lines.some((l) => l.id === p.id));

  const qtyOf = (id: number) => lines.find((l) => l.id === id)?.qty ?? 1;
  const pricesVisible =
    lineItems.length > 0 && lineItems.every((p) => p.priceCents !== null);
  const subtotalOf = (id: number) => {
    const p = lineItems.find((x) => x.id === id);
    return p?.priceCents == null ? null : p.priceCents * qtyOf(id);
  };
  const totalCents = pricesVisible
    ? lineItems.reduce((sum, p) => sum + (p.priceCents ?? 0) * qtyOf(p.id), 0)
    : 0;

  const orderLines = lineItems
    .map(
      (p, i) =>
        `${i + 1}. ${p.name}${p.sku ? ` (${dict.common.code}: ${p.sku})` : ""} — ${qtyOf(p.id)} ${dict.common.piece}`
    )
    .join("\n");
  const orderText = `${dict.cartPage.orderGreeting}\n\n${orderLines}\n\n${dict.cartPage.orderClosing}`;

  /**
   * One log per basket per channel.
   *
   * Both send buttons are live at once and each logged on click, so a customer
   * who opened WhatsApp, saw nothing happen and then tried email put two orders
   * in /admin/porosite — and a second click on the same link added a third.
   * The key is the lines themselves, so changing the basket makes a genuinely
   * new order loggable again.
   */
  const logged = useRef(new Set<string>());
  const logOrder = async (channel: "whatsapp" | "email") => {
    const key = `${channel}:${lines.map((l) => `${l.id}x${l.qty}`).join(",")}`;
    if (logged.current.has(key)) return "duplicate" as const;
    logged.current.add(key);
    try {
      return await logOrderAction({
        channel,
        lines: lines.map((l) => ({ id: l.id, qty: l.qty })),
      });
    } catch {
      // A logging failure must never stop the customer sending the order
      // itself — WhatsApp and the mail client are not involved in this call.
      return "failed" as const;
    }
  };

  return {
    lineItems,
    qtyOf,
    subtotalOf,
    totalQty: lines.reduce((sum, l) => sum + l.qty, 0),
    pricesVisible,
    totalCents,
    orderText,
    whatsappHref: `${SITE.whatsapp}?text=${encodeURIComponent(orderText)}`,
    mailHref: `mailto:${SITE.emails[0]}?subject=${encodeURIComponent(
      dict.cartPage.orderMailSubject
    )}&body=${encodeURIComponent(orderText)}`,
    logOrder,
  };
}

/**
 * What happened after the customer pressed a send button.
 *
 * `channel` is what they pressed; `log` is what the server made of it, and is
 * null until the action answers. The two are separate because the order does
 * not travel through the server at all — it leaves through WhatsApp or the
 * customer's own mail client — so "we could not record it" is a different fact
 * from "it was not sent", and only one of them is true when the log fails.
 */
export interface OrderSend {
  channel: "whatsapp" | "email" | null;
  log: OrderLogResult | null;
  send: (channel: "whatsapp" | "email") => void;
  reset: () => void;
}

export function useOrderSend(order: CartOrder): OrderSend {
  const [channel, setChannel] = useState<"whatsapp" | "email" | null>(null);
  const [log, setLog] = useState<OrderLogResult | null>(null);

  const send = (next: "whatsapp" | "email") => {
    setChannel(next);
    setLog(null);
    // Not awaited: the external app is opening in the same click, and the
    // customer must never wait on our database to reach it.
    void order.logOrder(next).then(setLog);
  };

  return {
    channel,
    log,
    send,
    reset: () => {
      setChannel(null);
      setLog(null);
    },
  };
}

/** True when the order left but no row was written to show for it. */
export function orderWentUnrecorded(log: OrderLogResult | null): boolean {
  return log === "rate-limited" || log === "failed" || log === "rejected";
}
