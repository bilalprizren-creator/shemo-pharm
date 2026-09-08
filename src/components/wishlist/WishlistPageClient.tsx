"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Heart, Loader2, ShoppingBag } from "lucide-react";
import type { CardProduct } from "@/lib/types";
import { fmt, langHref } from "@/lib/i18n";
import type { Dictionary } from "@/lib/dictionaries";
import { ProductCard } from "@/components/product/ProductCard";
import { useWishlist } from "./WishlistProvider";
import { useCart } from "@/components/cart/CartProvider";

export function WishlistPageClient({ dict }: { dict: Dictionary }) {
  const { ids, ready } = useWishlist();
  const { addLines, openCart } = useCart();
  const [items, setItems] = useState<CardProduct[] | null>(null);
  const [error, setError] = useState(false);

  // Watched as a string for the same reason the basket does it (useCartOrder):
  // the ids are what the request depends on, not the array holding them.
  const idKey = ids.join(",");

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

  const resolved = ready && idKey === "" ? [] : items;

  if (error) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 px-6 py-10 text-center">
        <p className="font-semibold text-red-800">{dict.wishlistPage.loadFailed}</p>
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
      <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-ink-900/12 bg-white px-6 py-16 text-center">
        <span className="flex size-16 items-center justify-center rounded-full bg-brand-50">
          <Heart className="size-7 text-brand-600" strokeWidth={1.5} aria-hidden />
        </span>
        <h2 className="mt-4 text-lg font-bold text-ink-900">
          {dict.wishlistPage.emptyTitle}
        </h2>
        <p className="mt-1.5 max-w-sm text-sm text-ink-500">
          {dict.wishlistPage.emptyText}
        </p>
        <Link
          href={langHref(dict.lang, "/produktet")}
          className="mt-6 inline-flex min-h-11 items-center rounded-full bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-700"
        >
          {dict.common.browseProducts}
        </Link>
      </div>
    );
  }

  return (
    <>
      {/* The list into the basket in one press. In B2B a wishlist is a reorder
          template — the products a pharmacy keeps buying — and taking it
          through to an order was twenty separate add clicks. Quantity one per
          line: what to order more of is decided in the basket. */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-ink-500">
          {fmt(dict.wishlistPage.addAllCount, { n: resolved.length })}
        </p>
        <button
          type="button"
          onClick={() => {
            addLines(resolved.map((p) => ({ id: p.id, qty: 1 })));
            openCart();
          }}
          className="inline-flex min-h-11 items-center gap-2 rounded-full bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-700"
        >
          <ShoppingBag className="size-4.5" aria-hidden />
          {dict.wishlistPage.addAllToCart}
        </button>
      </div>

      <ul className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 xl:grid-cols-4">
        {resolved.map((p) => (
          <li key={p.id}>
            <ProductCard product={p} dict={dict} />
          </li>
        ))}
      </ul>
    </>
  );
}
