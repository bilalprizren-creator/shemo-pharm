"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  Loader2,
  Mail,
  MessageCircle,
  Minus,
  Package,
  Plus,
  ShoppingBag,
  Trash2,
} from "lucide-react";
import { SITE } from "@/lib/site";
import type { CardProduct } from "@/lib/types";
import { langHref, fmt } from "@/lib/i18n";
import type { Dictionary } from "@/lib/dictionaries";
import { useCart } from "./CartProvider";
import { QtyInput } from "./QtyInput";

/** Parses "12,34 €" (server-formatted) back to cents for the local total. */
function priceToCents(price: string): number {
  const m = price.match(/(\d+),(\d{2})/);
  return m ? Number(m[1]) * 100 + Number(m[2]) : 0;
}

function formatCents(cents: number): string {
  return `${(cents / 100).toFixed(2).replace(".", ",")} €`;
}

export function CartPageClient({ dict }: { dict: Dictionary }) {
  const { lines, setQty, remove, clear, ready } = useCart();
  const [items, setItems] = useState<CardProduct[] | null>(null);
  const [error, setError] = useState(false);
  const lang = dict.lang;

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

  const resolved = ready && ids.length === 0 ? [] : items;

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

  const qtyOf = (id: number) => lines.find((l) => l.id === id)?.qty ?? 1;
  const pricesVisible = resolved.every((p) => p.price !== null);
  const totalCents = pricesVisible
    ? resolved.reduce((sum, p) => sum + priceToCents(p.price as string) * qtyOf(p.id), 0)
    : 0;

  const orderLines = resolved
    .map(
      (p, i) =>
        `${i + 1}. ${p.name}${p.sku ? ` (${dict.common.code}: ${p.sku})` : ""} — ${qtyOf(p.id)} ${dict.common.piece}`
    )
    .join("\n");
  const orderText = `${dict.cartPage.orderGreeting}\n\n${orderLines}\n\n${dict.cartPage.orderClosing}`;
  const whatsappHref = `${SITE.whatsapp}?text=${encodeURIComponent(orderText)}`;
  const mailHref = `mailto:${SITE.emails[0]}?subject=${encodeURIComponent(
    dict.cartPage.orderMailSubject
  )}&body=${encodeURIComponent(orderText)}`;

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_360px] lg:items-start">
      <ul className="divide-y divide-ink-900/6 rounded-xl border border-ink-900/8 bg-white">
        {resolved.map((p) => (
          <li key={p.id} className="flex items-center gap-3 p-3.5 sm:gap-4 sm:p-4">
            <Link
              href={langHref(lang, `/produktet/${p.slug}`)}
              className="relative flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-ink-900/6 bg-white sm:size-20"
            >
              {p.image ? (
                <Image src={p.image} alt="" fill sizes="80px" className="object-contain p-1.5" />
              ) : (
                <Package className="size-7 text-ink-300" aria-hidden />
              )}
            </Link>

            <div className="min-w-0 flex-1">
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
              {p.price && (
                <p className="mt-1 text-sm font-bold text-brand-800">{p.price}</p>
              )}
            </div>

            <div className="flex flex-col items-end gap-2">
              <div className="flex h-10 items-center rounded-lg border border-ink-900/12">
                <button
                  type="button"
                  onClick={() => setQty(p.id, qtyOf(p.id) - 1)}
                  aria-label={fmt(dict.cartPage.decreaseFor, { name: p.name })}
                  className="flex size-9 items-center justify-center rounded-l-lg text-ink-700 hover:bg-brand-50"
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
                  className="flex size-9 items-center justify-center rounded-r-lg text-ink-700 hover:bg-brand-50"
                >
                  <Plus className="size-3.5" aria-hidden />
                </button>
              </div>
              <button
                type="button"
                onClick={() => remove(p.id)}
                aria-label={fmt(dict.cartPage.removeFor, { name: p.name })}
                className="flex items-center gap-1 text-xs font-medium text-ink-400 hover:text-red-600"
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
            <dd className="font-semibold text-ink-900">{resolved.length}</dd>
          </div>
          <div className="flex justify-between">
            <dt>{dict.cartPage.totalQty}</dt>
            <dd className="font-semibold text-ink-900">
              {lines.reduce((s, l) => s + l.qty, 0)} {dict.common.piece}
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

        <div className="mt-5 space-y-2.5">
          <a
            href={whatsappHref}
            target="_blank"
            rel="noopener noreferrer"
            className="flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-accent-500 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-accent-600"
          >
            <MessageCircle className="size-4.5" aria-hidden />
            {dict.cartPage.sendWhatsapp}
          </a>
          <a
            href={mailHref}
            className="flex min-h-12 w-full items-center justify-center gap-2 rounded-full border border-ink-900/12 bg-white px-5 py-3 text-sm font-semibold text-ink-900 transition-colors hover:border-brand-400 hover:text-brand-700"
          >
            <Mail className="size-4.5 text-brand-600" aria-hidden />
            {dict.cartPage.sendEmail}
          </a>
          <button
            type="button"
            onClick={clear}
            className="w-full py-1 text-center text-xs font-medium text-ink-400 hover:text-red-600"
          >
            {dict.cartPage.clearCart}
          </button>
        </div>

        <p className="mt-4 text-[12px] leading-relaxed text-ink-400">
          {dict.cartPage.note}
        </p>
      </aside>
    </div>
  );
}
