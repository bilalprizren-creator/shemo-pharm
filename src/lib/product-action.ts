import type { Session } from "@/lib/auth";

/**
 * What a product page asks its visitor to do first.
 *
 * The page used to offer three filled purple buttons at once to a visitor who
 * was not logged in — "log in to see the price", "add to basket" and "order on
 * WhatsApp" — and so led with none of them. One leads now, chosen by who is
 * looking:
 *
 *   login    nobody is logged in. Prices are for partners, so logging in (or
 *            registering) is what unlocks the page; the basket stays
 *            available below it, because a request without prices is a real
 *            way to order here (logOrderAction accepts guests).
 *   pending  logged in, not yet approved. Logging in again would change
 *            nothing, so the page says the account is being checked and leads
 *            with the basket — the one thing that account can already do.
 *   order    an approved partner: the price, and the basket.
 *
 * Contact (WhatsApp, phone, email) follows in every case as the secondary way.
 *
 * The same gate as canSeePrices() in src/lib/auth.ts — `order` exactly when
 * prices are shown — kept a pure function of the session so it can be tested
 * without one.
 */
export type ProductAction = "login" | "pending" | "order";

export function productActionFor(session: Pick<Session, "status"> | null): ProductAction {
  if (!session) return "login";
  return session.status === "approved" ? "order" : "pending";
}
