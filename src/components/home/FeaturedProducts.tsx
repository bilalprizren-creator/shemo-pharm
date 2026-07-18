import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { langHref } from "@/lib/i18n";
import type { Dictionary } from "@/lib/dictionaries";
import type { CardProduct } from "@/lib/types";
import { ProductCard } from "@/components/product/ProductCard";

/**
 * A curated, four-across grid of featured products — standardized square
 * imagery, no carousel and no cut-off card. Supports the brand rather than
 * dominating the page.
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
        <div className="mb-8 flex flex-wrap items-end justify-between gap-3">
          <div className="max-w-xl">
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
          <Link
            href={langHref(dict.lang, "/produktet")}
            className="group inline-flex items-center gap-1.5 text-sm font-semibold text-brand-700 hover:text-brand-800"
          >
            {dict.common.viewAll}
            <ArrowRight
              className="size-4 transition-transform group-hover:translate-x-0.5"
              aria-hidden
            />
          </Link>
        </div>

        <ul className="grid grid-cols-2 gap-4 lg:grid-cols-4 lg:gap-5">
          {products.map((p) => (
            <li key={p.id} className="h-full">
              <ProductCard product={p} dict={dict} />
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
