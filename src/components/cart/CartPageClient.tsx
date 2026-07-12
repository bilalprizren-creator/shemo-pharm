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
import { useCart } from "./CartProvider";

/** Parses "12,34 €" (server-formatted) back to cents for the local total. */
function priceToCents(price: string): number {
  const m = price.match(/(\d+),(\d{2})/);
  return m ? Number(m[1]) * 100 + Number(m[2]) : 0;
}

function formatCents(cents: number): string {
  return `${(cents / 100).toFixed(2).replace(".", ",")} €`;
}

export function CartPageClient() {
  const { lines, setQty, remove, clear, ready } = useCart();
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

  const resolved = ready && ids.length === 0 ? [] : items;

  if (error) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 px-6 py-10 text-center">
        <p className="font-semibold text-red-800">
          Shporta nuk u ngarkua. Provoni ta rifreskoni faqen.
        </p>
      </div>
    );
  }

  if (!ready || resolved === null) {
    return (
      <div className="flex items-center justify-center gap-2 py-24 text-ink-400">
        <Loader2 className="size-5 animate-spin" aria-hidden />
        Duke ngarkuar…
      </div>
    );
  }

  if (resolved.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-ink-900/12 bg-white px-6 py-16 text-center">
        <span className="flex size-16 items-center justify-center rounded-full bg-brand-50">
          <ShoppingBag className="size-7 text-brand-600" strokeWidth={1.5} aria-hidden />
        </span>
        <h2 className="mt-4 text-lg font-bold text-ink-900">Shporta juaj është bosh</h2>
        <p className="mt-1.5 max-w-sm text-sm text-ink-500">
          Shtoni produkte në shportë dhe dërgoni porosinë përmes WhatsApp ose email.
        </p>
        <Link
          href="/produktet"
          className="mt-6 inline-flex min-h-11 items-center rounded-lg bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-700"
        >
          Shfleto produktet
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
        `${i + 1}. ${p.name}${p.sku ? ` (Kodi: ${p.sku})` : ""} — ${qtyOf(p.id)} copë`
    )
    .join("\n");
  const orderText = `Përshëndetje! Dëshiroj të porosis:\n\n${orderLines}\n\nJu lutem konfirmoni disponueshmërinë dhe çmimet. Faleminderit!`;
  const whatsappHref = `${SITE.whatsapp}?text=${encodeURIComponent(orderText)}`;
  const mailHref = `mailto:${SITE.emails[0]}?subject=${encodeURIComponent(
    "Porosi e re nga uebfaqja"
  )}&body=${encodeURIComponent(orderText)}`;

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_360px] lg:items-start">
      <ul className="divide-y divide-ink-900/6 rounded-xl border border-ink-900/8 bg-white">
        {resolved.map((p) => (
          <li key={p.id} className="flex items-center gap-3 p-3.5 sm:gap-4 sm:p-4">
            <Link
              href={`/produktet/${p.slug}`}
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
                href={`/produktet/${p.slug}`}
                className="line-clamp-2 text-sm font-semibold text-ink-900 hover:text-brand-700"
              >
                {p.name}
              </Link>
              <p className="mt-0.5 text-xs text-ink-400">
                {[p.sku && `Kodi: ${p.sku}`, p.categoryName].filter(Boolean).join(" · ")}
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
                  aria-label={`Zvogëlo sasinë për ${p.name}`}
                  className="flex size-9 items-center justify-center rounded-l-lg text-ink-700 hover:bg-brand-50"
                >
                  <Minus className="size-3.5" aria-hidden />
                </button>
                <span className="w-8 text-center text-sm font-bold text-ink-900">
                  {qtyOf(p.id)}
                </span>
                <button
                  type="button"
                  onClick={() => setQty(p.id, qtyOf(p.id) + 1)}
                  aria-label={`Rrit sasinë për ${p.name}`}
                  className="flex size-9 items-center justify-center rounded-r-lg text-ink-700 hover:bg-brand-50"
                >
                  <Plus className="size-3.5" aria-hidden />
                </button>
              </div>
              <button
                type="button"
                onClick={() => remove(p.id)}
                aria-label={`Hiq ${p.name} nga shporta`}
                className="flex items-center gap-1 text-xs font-medium text-ink-400 hover:text-red-600"
              >
                <Trash2 className="size-3.5" aria-hidden />
                Hiq
              </button>
            </div>
          </li>
        ))}
      </ul>

      <aside className="rounded-xl border border-ink-900/8 bg-white p-5 lg:sticky lg:top-40">
        <h2 className="text-lg font-bold text-ink-900">Përmbledhja e porosisë</h2>
        <dl className="mt-3 space-y-1.5 text-sm text-ink-500">
          <div className="flex justify-between">
            <dt>Produkte</dt>
            <dd className="font-semibold text-ink-900">{resolved.length}</dd>
          </div>
          <div className="flex justify-between">
            <dt>Sasia totale</dt>
            <dd className="font-semibold text-ink-900">
              {lines.reduce((s, l) => s + l.qty, 0)} copë
            </dd>
          </div>
          {pricesVisible && (
            <div className="flex justify-between border-t border-ink-900/8 pt-2 text-base">
              <dt className="font-semibold text-ink-900">Totali (orientues)</dt>
              <dd className="font-extrabold text-brand-800">{formatCents(totalCents)}</dd>
            </div>
          )}
        </dl>

        {!pricesVisible && (
          <p className="mt-3 rounded-lg bg-lavender px-3.5 py-2.5 text-[13px] leading-relaxed text-ink-500">
            <Link href="/kycu" className="font-semibold text-brand-700 hover:underline">
              Kyçuni
            </Link>{" "}
            për të parë çmimet me shumicë dhe totalin e porosisë.
          </p>
        )}

        <div className="mt-5 space-y-2.5">
          <a
            href={whatsappHref}
            target="_blank"
            rel="noopener noreferrer"
            className="flex min-h-12 w-full items-center justify-center gap-2 rounded-lg bg-accent-500 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-accent-600"
          >
            <MessageCircle className="size-4.5" aria-hidden />
            Dërgo porosinë në WhatsApp
          </a>
          <a
            href={mailHref}
            className="flex min-h-12 w-full items-center justify-center gap-2 rounded-lg border border-ink-900/12 bg-white px-5 py-3 text-sm font-semibold text-ink-900 transition-colors hover:border-brand-400 hover:text-brand-700"
          >
            <Mail className="size-4.5 text-brand-600" aria-hidden />
            Dërgo me email
          </a>
          <button
            type="button"
            onClick={clear}
            className="w-full py-1 text-center text-xs font-medium text-ink-400 hover:text-red-600"
          >
            Zbraz shportën
          </button>
        </div>

        <p className="mt-4 text-[12px] leading-relaxed text-ink-400">
          Kjo është një kërkesë porosie — ekipi i SHEMO PHARM ju kontakton për të
          konfirmuar disponueshmërinë, çmimet dhe dërgesën.
        </p>
      </aside>
    </div>
  );
}
