"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  CheckCircle2,
  Loader2,
  Mail,
  MessageCircle,
  Minus,
  Package,
  Plus,
  ShoppingBag,
  Trash2,
  X,
} from "lucide-react";
import { fmt, langHref } from "@/lib/i18n";
import type { Dictionary } from "@/lib/dictionaries";
import { useCart } from "./CartProvider";
import { QtyInput } from "./QtyInput";
import { formatCents, useCartItems, useCartOrder } from "./useCartOrder";

/**
 * The basket as a side panel: the cart icon slides it in over the current
 * page instead of navigating away, so a customer can keep browsing and still
 * send the order from here. /shporta stays as the full page — same lines,
 * same WhatsApp/email order text (see useCartOrder) — and is what the panel's
 * footer link and any no-JS visitor land on.
 *
 * Mounted globally in the layout but inert until first opened: nothing is
 * rendered and no product lookup runs until the customer asks for the basket.
 */
export function CartDrawer({ dict }: { dict: Dictionary }) {
  const { open } = useCart();
  // State adjustment during render: once opened, the panel keeps its resolved
  // products so the second open is instant.
  const [used, setUsed] = useState(false);
  if (open && !used) setUsed(true);

  if (!used) return null;
  return <CartPanel dict={dict} />;
}

function CartPanel({ dict }: { dict: Dictionary }) {
  const { open, closeCart, setQty, remove, clear } = useCart();
  const { items, error, ready } = useCartItems();
  const order = useCartOrder(items ?? [], dict);
  // The order leaves through WhatsApp or a mail client, so the site never
  // hears back. Saying so — and offering to empty the basket — is what stops
  // a customer wondering whether it worked and sending it a second time.
  const [sent, setSent] = useState(false);
  const pathname = usePathname();
  const panelRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const lang = dict.lang;

  // A link inside the panel navigated — the panel has done its job.
  // (The ref starts at the current path so opening never self-closes.)
  const seenPath = useRef(pathname);
  useEffect(() => {
    if (seenPath.current === pathname) return;
    seenPath.current = pathname;
    closeCart();
  }, [pathname, closeCart]);

  // Scroll lock + initial focus + Escape + focus trap, as in the mobile nav
  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement as HTMLElement | null;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeCart();
      if (e.key === "Tab" && panelRef.current) {
        const focusables = panelRef.current.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), input:not([disabled])'
        );
        if (focusables.length === 0) return;
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      document.removeEventListener("keydown", onKey);
      previous?.focus();
    };
  }, [open, closeCart]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50"
      role="dialog"
      aria-modal="true"
      aria-label={dict.cartPage.title}
    >
      <button
        type="button"
        tabIndex={-1}
        aria-label={dict.cartPage.closeDrawer}
        onClick={closeCart}
        className="fade-in absolute inset-0 bg-ink-900/45"
      />

      {/* Enter animation only — closing unmounts at once, so the panel can
          never linger half-open in front of the page. */}
      <div
        ref={panelRef}
        className="drawer-in absolute right-0 top-0 flex h-full w-[min(92vw,420px)] flex-col bg-white shadow-drawer"
      >
        <div className="flex items-center justify-between gap-3 border-b border-ink-900/8 px-4 py-3.5">
          <h2 className="flex items-center gap-2 font-display text-lg font-bold text-ink-900">
            <ShoppingBag className="size-5 text-brand-600" aria-hidden />
            {dict.cartPage.title}
            {order.totalQty > 0 && (
              <span className="rounded-full bg-brand-50 px-2 py-0.5 text-xs font-semibold text-brand-800">
                {order.totalQty}
              </span>
            )}
          </h2>
          <button
            ref={closeRef}
            type="button"
            onClick={closeCart}
            aria-label={dict.cartPage.closeDrawer}
            className="flex size-10 items-center justify-center rounded-full text-ink-700 hover:bg-ink-900/5"
          >
            <X className="size-5.5" aria-hidden />
          </button>
        </div>

        {error ? (
          <div className="px-4 py-10 text-center text-sm font-semibold text-red-800">
            {dict.cartPage.loadFailed}
          </div>
        ) : !ready || items === null ? (
          <div className="flex flex-1 items-center justify-center gap-2 text-ink-400">
            <Loader2 className="size-5 animate-spin" aria-hidden />
            {dict.common.loading}
          </div>
        ) : items.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center px-6 text-center">
            <span className="flex size-16 items-center justify-center rounded-full bg-brand-50">
              <ShoppingBag className="size-7 text-brand-600" strokeWidth={1.5} aria-hidden />
            </span>
            <p className="mt-4 text-base font-bold text-ink-900">
              {dict.cartPage.emptyTitle}
            </p>
            <p className="mt-1.5 text-sm text-ink-500">{dict.cartPage.emptyText}</p>
            <Link
              href={langHref(lang, "/produktet")}
              onClick={closeCart}
              className="mt-6 inline-flex min-h-11 items-center rounded-full bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-700"
            >
              {dict.common.browseProducts}
            </Link>
          </div>
        ) : (
          <>
            <ul className="flex-1 divide-y divide-ink-900/6 overflow-y-auto">
              {items.map((p) => (
                <li key={p.id} className="flex gap-3 p-4">
                  <Link
                    href={langHref(lang, `/produktet/${p.slug}`)}
                    onClick={closeCart}
                    className="relative flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-ink-900/6 bg-white"
                  >
                    {p.image ? (
                      <Image
                        src={p.image}
                        alt=""
                        fill
                        sizes="64px"
                        className="object-contain p-1.5"
                      />
                    ) : (
                      <Package className="size-6 text-ink-300" aria-hidden />
                    )}
                  </Link>

                  <div className="min-w-0 flex-1">
                    <Link
                      href={langHref(lang, `/produktet/${p.slug}`)}
                      onClick={closeCart}
                      className="line-clamp-2 text-sm font-semibold leading-snug text-ink-900 hover:text-brand-700"
                    >
                      {p.name}
                    </Link>
                    {p.price && (
                      <p className="mt-0.5 text-sm font-bold text-brand-800">{p.price}</p>
                    )}

                    <div className="mt-2 flex items-center justify-between gap-2">
                      {/* The drawer is the cart most customers actually use on
                          a phone, and its steppers were the smallest controls
                          on the site at 32px. Same 44px as the /shporta page. */}
                      <div className="flex h-11 items-center rounded-lg border border-ink-900/12">
                        <button
                          type="button"
                          onClick={() => setQty(p.id, order.qtyOf(p.id) - 1)}
                          aria-label={fmt(dict.cartPage.decreaseFor, { name: p.name })}
                          className="flex size-11 items-center justify-center rounded-l-lg text-ink-700 hover:bg-brand-50"
                        >
                          <Minus className="size-3.5" aria-hidden />
                        </button>
                        <QtyInput
                          value={order.qtyOf(p.id)}
                          onChange={(qty) => setQty(p.id, qty)}
                          label={dict.cartPage.qtyInput}
                          className="w-10"
                        />
                        <button
                          type="button"
                          onClick={() => setQty(p.id, order.qtyOf(p.id) + 1)}
                          aria-label={fmt(dict.cartPage.increaseFor, { name: p.name })}
                          className="flex size-11 items-center justify-center rounded-r-lg text-ink-700 hover:bg-brand-50"
                        >
                          <Plus className="size-3.5" aria-hidden />
                        </button>
                      </div>
                      <button
                        type="button"
                        onClick={() => remove(p.id)}
                        aria-label={fmt(dict.cartPage.removeFor, { name: p.name })}
                        className="flex min-h-11 items-center gap-1 px-2 text-xs font-medium text-ink-400 hover:text-red-600"
                      >
                        <Trash2 className="size-3.5" aria-hidden />
                        {dict.cartPage.removeWord}
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>

            <div className="border-t border-ink-900/8 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-4">
              {sent ? (
                <div role="status">
                  <p className="flex items-center gap-2 text-sm font-bold text-ink-900">
                    <CheckCircle2 className="size-5 text-accent-600" aria-hidden />
                    {dict.cartPage.orderSentTitle}
                  </p>
                  <p className="mt-1 text-[13px] leading-relaxed text-ink-500">
                    {dict.cartPage.orderSentText}
                  </p>
                  <div className="mt-3 flex gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        clear();
                        setSent(false);
                      }}
                      className="min-h-11 flex-1 rounded-full bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-700"
                    >
                      {dict.cartPage.clearCart}
                    </button>
                    <button
                      type="button"
                      onClick={() => setSent(false)}
                      className="min-h-11 flex-1 rounded-full border border-ink-900/12 bg-white px-4 py-2.5 text-sm font-semibold text-ink-900 transition-colors hover:border-brand-400 hover:text-brand-700"
                    >
                      {dict.cartPage.keepCart}
                    </button>
                  </div>
                </div>
              ) : (
                <>
              {order.pricesVisible ? (
                <div className="flex items-baseline justify-between">
                  <span className="text-sm font-semibold text-ink-900">
                    {dict.cartPage.totalEstimate}
                  </span>
                  <span className="text-lg font-extrabold text-brand-800">
                    {formatCents(order.totalCents)}
                  </span>
                </div>
              ) : (
                <p className="rounded-lg bg-tint px-3.5 py-2.5 text-[13px] leading-relaxed text-ink-500">
                  <Link
                    href={langHref(lang, "/kycu")}
                    onClick={closeCart}
                    className="font-semibold text-brand-700 hover:underline"
                  >
                    {dict.cartPage.loginWord}
                  </Link>{" "}
                  {dict.cartPage.loginForTotals}
                </p>
              )}

              <div className="mt-3 space-y-2">
                <a
                  href={order.whatsappHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => {
                    order.logOrder("whatsapp");
                    setSent(true);
                  }}
                  className="flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-accent-500 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-accent-600"
                >
                  <MessageCircle className="size-4.5" aria-hidden />
                  {dict.cartPage.sendWhatsapp}
                </a>
                <a
                  href={order.mailHref}
                  onClick={() => {
                    order.logOrder("email");
                    setSent(true);
                  }}
                  className="flex min-h-12 w-full items-center justify-center gap-2 rounded-full border border-ink-900/12 bg-white px-5 py-3 text-sm font-semibold text-ink-900 transition-colors hover:border-brand-400 hover:text-brand-700"
                >
                  <Mail className="size-4.5 text-brand-600" aria-hidden />
                  {dict.cartPage.sendEmail}
                </a>
              </div>

              <div className="mt-3 flex items-center justify-between gap-3">
                <Link
                  href={langHref(lang, "/shporta")}
                  onClick={closeCart}
                  className="text-xs font-semibold text-brand-700 hover:text-brand-800 hover:underline"
                >
                  {dict.cartPage.viewFullCart}
                </Link>
                <button
                  type="button"
                  onClick={clear}
                  className="text-xs font-medium text-ink-400 hover:text-red-600"
                >
                  {dict.cartPage.clearCart}
                </button>
              </div>
                </>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
