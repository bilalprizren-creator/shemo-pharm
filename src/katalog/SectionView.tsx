import Link from "next/link";
import { ArrowLeft, ArrowRight, Printer } from "lucide-react";
import { canSeePrices, getSession } from "@/lib/auth";
import {
  catalogSectionSlug,
  getCatalogSections,
  toCardProducts,
  type CatalogSectionWithProducts,
} from "@/lib/catalog";
import { langHref, fmt } from "@/lib/i18n";
import { getSiteMode, sitePath } from "@/lib/site-mode";
import { sheetsFor } from "@/katalog/sheets";
import type { Dictionary } from "@/lib/dictionaries";
import { ProductCard } from "@/components/product/ProductCard";
import { Breadcrumbs } from "@/components/catalog/Breadcrumbs";

/**
 * One numbered section of the printed catalogue, in printed order.
 *
 * What this deliberately does not reproduce from shemo-katalog.com: the fixed
 * twelve-per-A4-page grid and the `transform: scale(0.5)` that shrank it onto
 * phones, which rendered product names at an effective 6px. The grid here is
 * fluid and the type is the site's own; the printed geometry lives in
 * /katalog/shtyp and only there.
 */
export async function SectionView({
  section,
  dict,
}: {
  section: CatalogSectionWithProducts;
  dict: Dictionary;
}) {
  const mode = await getSiteMode();
  const href = (p: string) => langHref(dict.lang, sitePath(mode, p));
  const session = await getSession();
  const cards = await toCardProducts(section.products, canSeePrices(session));

  // Previous and next in printed order, so the section pages read as a sequence
  // rather than as 63 unconnected pages.
  const all = await getCatalogSections();
  const at = all.findIndex((s) => s.id === section.id);
  const prev = at > 0 ? all[at - 1] : undefined;
  const next = at < all.length - 1 ? all[at + 1] : undefined;

  const slug = catalogSectionSlug(section);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 lg:px-6 lg:py-10">
      <Breadcrumbs
        items={[
          { label: dict.printedCatalog.title, href: sitePath(mode, "/katalog") },
          { label: `${section.catalogNo} ${section.name}` },
        ]}
        dict={dict}
      />

      <div className="mt-4 flex flex-wrap items-end justify-between gap-3">
        <div className="flex items-baseline gap-3">
          <span className="rounded-md bg-accent-500 px-2.5 py-1 font-mono text-base font-bold text-accent-950">
            {section.catalogNo}
          </span>
          <div>
            <h1 className="text-3xl font-extrabold text-ink-900 sm:text-4xl">{section.name}</h1>
            <p className="mt-1 text-sm text-ink-400">
              {fmt(dict.catalog.productsCount, { n: section.products.length })}
            </p>
          </div>
        </div>
        <Link
          href={href(`/katalog/shtyp?seksioni=${slug}`)}
          className="inline-flex items-center gap-2 rounded-field border border-line bg-white px-4 py-2 text-sm font-medium text-ink-700 transition-colors hover:border-brand-200 hover:text-brand-700"
        >
          <Printer className="size-4" aria-hidden />
          {dict.printedCatalog.print}
          <span className="font-normal text-ink-400">
            · {fmt(dict.printedCatalog.printPages, { n: sheetsFor([section]).length })}
          </span>
        </Link>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
        {cards.map((product, i) => (
          <ProductCard
            key={product.id}
            product={product}
            dict={dict}
            mode={mode}
            priority={i < 5}
          />
        ))}
      </div>

      <nav
        aria-label={dict.printedCatalog.contents}
        className="mt-10 flex flex-wrap items-stretch justify-between gap-3 border-t border-line pt-6"
      >
        {prev ? (
          <Link
            href={href(`/katalog/${catalogSectionSlug(prev)}`)}
            className="group flex min-w-0 max-w-[45%] items-center gap-2 text-sm text-ink-700 transition-colors hover:text-brand-700"
          >
            <ArrowLeft className="size-4 shrink-0" aria-hidden />
            <span className="truncate">
              <span className="font-mono text-xs text-accent-700">{prev.catalogNo}</span>{" "}
              {prev.name}
            </span>
          </Link>
        ) : (
          <span />
        )}
        <Link
          href={href("/katalog")}
          className="text-sm font-medium text-ink-700 transition-colors hover:text-brand-700"
        >
          {dict.printedCatalog.contents}
        </Link>
        {next ? (
          <Link
            href={href(`/katalog/${catalogSectionSlug(next)}`)}
            className="group flex min-w-0 max-w-[45%] items-center gap-2 text-sm text-ink-700 transition-colors hover:text-brand-700"
          >
            <span className="truncate">
              <span className="font-mono text-xs text-accent-700">{next.catalogNo}</span>{" "}
              {next.name}
            </span>
            <ArrowRight className="size-4 shrink-0" aria-hidden />
          </Link>
        ) : (
          <span />
        )}
      </nav>
    </div>
  );
}
