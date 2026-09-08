"use client";

import Image from "next/image";
import { thumbnailFor } from "@/lib/images";
import Link from "next/link";
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
} from "lucide-react";
import { langHref, fmt } from "@/lib/i18n";
import type { Dictionary } from "@/lib/dictionaries";
import { PhotoWell, PHOTO_SHADOW_SM, photoPresentation } from "@/components/product/PhotoWell";
import { useCart } from "./CartProvider";
import { QtyInput } from "./QtyInput";
import {
  formatCents,
  orderWentUnrecorded,
  useCartItems,
  useCartOrder,
  useOrderSend,
} from "./useCartOrder";
import { CopyOrderButton } from "./CopyOrderButton";
import { ClearCartButton } from "./ClearCartButton";
import { SITE } from "@/lib/site";

export function CartPageClient({ dict }: { dict: Dictionary }) {
  const { setQty, remove, clear } = useCart();
  const { items: resolved, error, ready } = useCartItems();
  const order = useCartOrder(resolved ?? [], dict);
  const lang = dict.lang;
  // The order leaves through WhatsApp or a mail client, so the site never
  // hears back — this is the only confirmation the customer gets.
  const send = useOrderSend(order);
  const sent = send.channel !== null;

  if (error) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 px-6 py-10 text-center">
        <p className="font-semibold text-red-800">{dict.cartPage.loadFailed}</p>
      </div>
    );
  }

  if (!ready || resolved === null) {
    return (
      <div className="flex items-center justify-center gap-2 py-24 text-ink-400">
        <Loader2 className="size-5 animate-spin" aria-hidden />
        {dict.common.loading}
      </div>
    );
  }

  if (resolved.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-ink-900/12 bg-white px-6 py-16 text-center">
        <span className="flex size-16 items-center justify-center rounded-full bg-brand-50">
          <ShoppingBag className="size-7 text-brand-600" strokeWidth={1.5} aria-hidden />
        </span>
        <h2 className="mt-4 text-lg font-bold text-ink-900">
          {dict.cartPage.emptyTitle}
        </h2>
        <p className="mt-1.5 max-w-sm text-sm text-ink-500">
          {dict.cartPage.emptyText}
        </p>
        <Link
          href={langHref(lang, "/produktet")}
          className="mt-6 inline-flex min-h-11 items-center rounded-full bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-700"
        >
          {dict.common.browseProducts}
        </Link>
      </div>
    );
  }

  const { qtyOf, subtotalOf, pricesVisible, totalCents, whatsappHref, mailHref } = order;

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_360px] lg:items-start">
      <ul className="divide-y divide-ink-900/6 rounded-xl border border-ink-900/8 bg-white">
        {order.lineItems.map((p) => (
          <li
            key={p.id}
            // Wraps rather than squeezes: with 44px steppers the quantity block
            // needs 138px, which on a 320px screen left the product name about
            // thirty. Below roughly 350px the controls drop to their own line;
            // above it the row is unchanged.
            className="flex flex-wrap items-center gap-3 p-3.5 sm:gap-4 sm:p-4"
          >
            <Link href={langHref(lang, `/produktet/${p.slug}`)} className="shrink-0">
              <PhotoWell
                className="flex size-16 items-center justify-center overflow-hidden rounded-lg border border-ink-900/6 sm:size-20"
                cutOut={photoPresentation(p.image, { pad: "p-1.5", shadow: PHOTO_SHADOW_SM }).cutOut}
              >
                {p.image ? (
                  <Image
                    src={thumbnailFor(p.image)}
                    alt=""
                    fill
                    sizes="80px"
                    className={photoPresentation(p.image, { pad: "p-1.5", shadow: PHOTO_SHADOW_SM }).className}
                  />
                ) : (
                  <Package className="size-7 text-ink-300" aria-hidden />
                )}
              </PhotoWell>
            </Link>

            <div className="min-w-20 flex-1">
              <Link
                href={langHref(lang, `/produktet/${p.slug}`)}
                className="line-clamp-2 text-sm font-semibold text-ink-900 hover:text-brand-700"
              >
                {p.name}
              </Link>
              <p className="mt-0.5 text-xs text-ink-400">
                {[p.sku && `${dict.common.code}: ${p.sku}`, p.categoryName]
                  .filter(Boolean)
                  .join(" · ")}
              </p>
              <div className="mt-1 flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                {p.price && (
                  <p className="text-sm font-bold text-brand-800">{p.price}</p>
                )}
                {/* The line's own money — the unit price alone does not answer
                    "what is this row costing me", which is what a wholesale
                    buyer checks before sending forty of them. */}
                {subtotalOf(p.id) !== null && qtyOf(p.id) > 1 && (
                  <p className="text-xs text-ink-400">
                    {fmt(dict.cartPage.lineTotal, { sum: formatCents(subtotalOf(p.id)!) })}
                  </p>
                )}
                {/* Out of stock where the line is. The card and the product
                    page both said so; the basket did not, so a long order could
                    quietly carry items nobody can ship. */}
                {!p.inStock && (
                  <span className="rounded-full bg-ink-900/6 px-2 py-0.5 text-[11px] font-semibold text-ink-500">
                    {dict.cartPage.outOfStock}
                  </span>
                )}
              </div>
            </div>

            <div className="ml-auto flex shrink-0 flex-col items-end gap-2">
              {/* 44px steppers on touch: at size-9 these were 36px, below the
                  target size this project keeps everywhere else, and they sit
                  directly beside a destructive control. */}
              <div className="flex h-11 items-center rounded-lg border border-ink-900/12">
                <button
                  type="button"
                  // Clamps at one — the trash button is how a line goes away.
                  onClick={() => setQty(p.id, Math.max(1, qtyOf(p.id) - 1))}
                  aria-label={fmt(dict.cartPage.decreaseFor, { name: p.name })}
                  className="flex size-11 items-center justify-center rounded-l-lg text-ink-700 hover:bg-brand-50"
                >
                  <Minus className="size-3.5" aria-hidden />
                </button>
                <QtyInput
                  value={qtyOf(p.id)}
                  onChange={(qty) => setQty(p.id, qty)}
                  label={dict.cartPage.qtyInput}
                  className="w-12"
                />
                <button
                  type="button"
                  onClick={() => setQty(p.id, qtyOf(p.id) + 1)}
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
          </li>
        ))}
      </ul>

      <aside className="rounded-xl border border-ink-900/8 bg-white p-5 lg:sticky lg:top-40">
        <h2 className="text-lg font-bold text-ink-900">{dict.cartPage.summary}</h2>
        <dl className="mt-3 space-y-1.5 text-sm text-ink-500">
          <div className="flex justify-between">
            <dt>{dict.cartPage.productsRow}</dt>
            <dd className="font-semibold text-ink-900">{order.lineItems.length}</dd>
          </div>
          <div className="flex justify-between">
            <dt>{dict.cartPage.totalQty}</dt>
            <dd className="font-semibold text-ink-900">
              {order.totalQty} {dict.common.piece}
            </dd>
          </div>
          {pricesVisible && (
            <div className="flex justify-between border-t border-ink-900/8 pt-2 text-base">
              <dt className="font-semibold text-ink-900">
                {dict.cartPage.totalEstimate}
              </dt>
              <dd className="font-extrabold text-brand-800">{formatCents(totalCents)}</dd>
            </div>
          )}
        </dl>

        {!pricesVisible && (
          <p className="mt-3 rounded-lg bg-tint px-3.5 py-2.5 text-[13px] leading-relaxed text-ink-500">
            <Link
              href={langHref(lang, "/kycu")}
              className="font-semibold text-brand-700 hover:underline"
            >
              {dict.cartPage.loginWord}
            </Link>{" "}
            {dict.cartPage.loginForTotals}
          </p>
        )}

        {sent ? (
          <div className="mt-5 rounded-xl bg-accent-50 px-4 py-4" role="status">
            {/* The mail channel opens the customer's own mail client, which on
                a desktop with none registered does nothing and says nothing —
                so this reports what was attempted, and hands over the text. */}
            <p className="flex items-center gap-2 text-sm font-bold text-ink-900">
              <CheckCircle2 className="size-5 text-accent-600" aria-hidden />
              {send.channel === "email"
                ? dict.cartPage.mailOpenedTitle
                : dict.cartPage.orderSentTitle}
            </p>
            <p className="mt-1 text-[13px] leading-relaxed text-ink-600">
              {send.channel === "email"
                ? fmt(dict.cartPage.mailOpenedText, { email: SITE.emails[0] })
                : dict.cartPage.orderSentText}
            </p>
            {send.channel === "email" && (
              <div className="mt-3">
                <CopyOrderButton
                  text={order.orderText}
                  labels={{
                    copy: dict.cartPage.copyOrder,
                    copied: dict.cartPage.orderCopied,
                  }}
                />
              </div>
            )}
            {orderWentUnrecorded(send.log) && (
              <p className="mt-3 rounded-lg bg-white/70 px-3 py-2 text-[13px] leading-relaxed text-ink-600">
                {dict.cartPage.notRecorded}
              </p>
            )}
            <div className="mt-3 flex gap-2">
              <button
                type="button"
                onClick={() => {
                  clear();
                  send.reset();
                }}
                className="min-h-11 flex-1 rounded-full bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-700"
              >
                {dict.cartPage.clearCart}
              </button>
              <button
                type="button"
                onClick={send.reset}
                className="min-h-11 flex-1 rounded-full border border-ink-900/12 bg-white px-4 py-2.5 text-sm font-semibold text-ink-900 transition-colors hover:border-brand-400 hover:text-brand-700"
              >
                {dict.cartPage.keepCart}
              </button>
            </div>
          </div>
        ) : (
          <div className="mt-5 space-y-2.5">
            <a
              href={whatsappHref}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => send.send("whatsapp")}
              className="flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-accent-500 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-accent-600"
            >
              <MessageCircle className="size-4.5" aria-hidden />
              {dict.cartPage.sendWhatsapp}
            </a>
            <a
              href={mailHref}
              onClick={() => send.send("email")}
              className="flex min-h-12 w-full items-center justify-center gap-2 rounded-full border border-ink-900/12 bg-white px-5 py-3 text-sm font-semibold text-ink-900 transition-colors hover:border-brand-400 hover:text-brand-700"
            >
              <Mail className="size-4.5 text-brand-600" aria-hidden />
              {dict.cartPage.sendEmail}
            </a>
            <ClearCartButton
              labels={{
                clear: dict.cartPage.clearCart,
                confirm: dict.cartPage.clearConfirm,
                undo: dict.cartPage.clearUndo,
                cleared: dict.cartPage.cartCleared,
              }}
              className="min-h-11 w-full py-1 text-center text-xs font-medium text-ink-400 hover:text-red-600"
              confirmClassName="min-h-11 w-full py-1 text-center text-xs font-bold text-red-600 underline underline-offset-2"
            />
          </div>
        )}

        {/* Said once for the whole basket as well as per line: the chips are
            easy to scroll past on a long order, and this is the sentence that
            explains what sending one anyway means. */}
        {order.lineItems.some((p) => !p.inStock) && (
          <p className="mt-4 rounded-lg bg-tint px-3 py-2 text-[12px] leading-relaxed text-ink-500">
            {dict.cartPage.outOfStockNote}
          </p>
        )}

        <p className="mt-4 text-[12px] leading-relaxed text-ink-400">
          {dict.cartPage.note}
        </p>
      </aside>
    </div>
  );
}
