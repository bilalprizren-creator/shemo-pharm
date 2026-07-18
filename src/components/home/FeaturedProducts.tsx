import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { langHref } from "@/lib/i18n";
import type { Dictionary } from "@/lib/dictionaries";
import type { CardProduct } from "@/lib/types";
import { ProductCard } from "@/components/product/ProductCard";

/**
 * A curated grid of exactly four featured products — standardized square
 * imagery, no carousel and no cut-off card. Desktop 4-up, tablet 2-up, mobile
 * 1-up. A single clear catalog button sits below the grid.
 */
export function FeaturedProducts({
  products,
  dict,
}: {
  products: CardProduct[];
  dict: Dictionary;
}) {
  if (products.length === 0) return null;

  return (
    <section aria-labelledby="veçuara-titulli" className="bg-surface">
      <div className="mx-auto max-w-7xl px-4 py-14 lg:px-6 lg:py-20">
        <div className="mb-8 max-w-xl">
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-accent-700">
            {dict.home.featuredEyebrow}
          </p>
          <h2
            id="veçuara-titulli"
            className="mt-2 font-display text-2xl font-bold tracking-tight text-ink-900 sm:text-3xl"
          >
            {dict.home.featuredTitle}
          </h2>
          <p className="mt-2 text-sm text-ink-500 sm:text-base">
            {dict.home.featuredSubtitle}
          </p>
        </div>

        <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:gap-5 xl:grid-cols-4">
          {products.map((p) => (
            <li key={p.id} className="h-full">
              <ProductCard product={p} dict={dict} />
            </li>
          ))}
        </ul>

        <div className="mt-10 text-center">
          <Link
            href={langHref(dict.lang, "/produktet")}
            className="group inline-flex min-h-12 items-center gap-2 rounded-full bg-brand-600 px-7 py-3 text-sm font-semibold text-white shadow-lg shadow-brand-600/20 transition-colors hover:bg-brand-700"
          >
            {dict.home.featuredCta}
            <ArrowRight
              className="size-4 transition-transform group-hover:translate-x-0.5"
              aria-hidden
            />
          </Link>
        </div>
      </div>
    </section>
  );
}
