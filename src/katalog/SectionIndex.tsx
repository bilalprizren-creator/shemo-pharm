import Image from "next/image";
import Link from "next/link";
import { List, Package, Printer, Search } from "lucide-react";
import {
  catalogSectionSlug,
  getAllProductsInCatalogOrder,
  getCatalogSections,
  getEmptyCatalogSections,
  productImage,
} from "@/lib/catalog";
import { sheetsFor } from "@/katalog/sheets";
import { langHref, fmt } from "@/lib/i18n";
import { getSiteMode, sitePath } from "@/lib/site-mode";
import type { Dictionary } from "@/lib/dictionaries";
import { Breadcrumbs } from "@/components/catalog/Breadcrumbs";

/**
 * The printed catalogue's table of contents: the numbered sections in the order
 * the paper edition prints them, each linking to its own page. 61 of the 63 —
 * the note under the summary says which two are missing, and why.
 *
 * Split by section rather than rendered as one long page, and the reason is
 * measured. One page holding all 1 733 products came to 2.07 MB gzipped —
 * 24 times the HTML the old site shipped, trading its image problem for a
 * markup one. A single section is around 76 KB, the same as /produktet.
 *
 * It also matches how the catalogue is used: somebody holding the paper edition
 * is looking for section 6.7, not for a 150 000 px scroll.
 */
export async function SectionIndex({ dict }: { dict: Dictionary }) {
  const sections = await getCatalogSections();
  const mode = await getSiteMode();
  const href = (p: string) => langHref(dict.lang, sitePath(mode, p));
  const total = sections.reduce((n, s) => n + s.products.length, 0);
  // Includes the 311 that were never printed, which is the whole point of the
  // link this number labels.
  const allCount = (await getAllProductsInCatalogOrder()).length;
  // Sections the paper edition prints that the range no longer carries, so the
  // gap between 61 and 63 is explained rather than left to be discovered.
  const missing = await getEmptyCatalogSections();
  // Costs nothing here — getCatalogSections() is already loaded and cached —
  // and 163 is the number that makes somebody print one section instead.
  const sheets = sheetsFor(sections).length;

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 lg:px-6 lg:py-10">
      <Breadcrumbs items={[{ label: dict.printedCatalog.title }]} dict={dict} />

      <div className="mt-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-extrabold text-ink-900 sm:text-4xl">
            {dict.printedCatalog.title}
          </h1>
          <p className="mt-2 max-w-2xl text-ink-500">{dict.printedCatalog.subtitle}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href={href("/katalog/te-gjitha")}
            className="inline-flex items-center gap-2 rounded-field border border-line bg-white px-4 py-2 text-sm font-medium text-ink-700 transition-colors hover:border-brand-200 hover:text-brand-700"
          >
            <List className="size-4" aria-hidden />
            {fmt(dict.printedCatalog.allLink, { n: allCount })}
          </Link>
          <Link
            // The catalogue has its own narrow search; /produktet is the shop's
            // filterable listing and does not exist on the catalogue domain.
            href={href(mode === "katalog" ? "/kerko" : "/produktet")}
            className="inline-flex items-center gap-2 rounded-field border border-line bg-white px-4 py-2 text-sm font-medium text-ink-700 transition-colors hover:border-brand-200 hover:text-brand-700"
          >
            <Search className="size-4" aria-hidden />
            {dict.printedCatalog.searchInstead}
          </Link>
          <Link
            href={href("/katalog/shtyp")}
            className="inline-flex items-center gap-2 rounded-field bg-brand-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand-700"
          >
            <Printer className="size-4" aria-hidden />
            {dict.printedCatalog.print}
            <span className="font-normal text-brand-100">
              · {fmt(dict.printedCatalog.printPages, { n: sheets })}
            </span>
          </Link>
        </div>
      </div>

      <p className="mt-6 text-sm text-ink-400">
        {fmt(dict.printedCatalog.summary, { sections: sections.length, products: total })}
      </p>

      {missing.length > 0 && (
        <p className="mt-2 max-w-3xl text-sm text-ink-500">
          {fmt(dict.printedCatalog.missingSections, {
            names: missing.map((s) => `${s.catalogNo} ${s.name}`).join(", "),
          })}
        </p>
      )}

      <ol
        aria-label={dict.printedCatalog.contents}
        className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3"
      >
        {sections.map((section, i) => {
          // One thumbnail per section, from its first product — enough to make
          // the list scannable without loading the section itself.
          const cover = productImage(section.products[0]);
          return (
            <li key={section.id}>
              <Link
                href={href(`/katalog/${catalogSectionSlug(section)}`)}
                className="group flex h-full items-center gap-4 rounded-2xl border border-line bg-white p-3 transition-all hover:-translate-y-0.5 hover:border-brand-200 hover:shadow-card-hover"
              >
                <div className="relative flex size-16 shrink-0 items-center justify-center rounded-xl bg-surface">
                  {cover ? (
                    <Image
                      src={cover}
                      alt=""
                      fill
                      sizes="64px"
                      priority={i < 6}
                      className="object-contain p-2"
                    />
                  ) : (
                    <Package className="size-6 text-ink-300" strokeWidth={1.25} aria-hidden />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <span className="font-mono text-xs font-bold text-accent-700">
                    {section.catalogNo}
                  </span>
                  <p className="truncate font-semibold text-ink-900 group-hover:text-brand-700">
                    {section.name}
                  </p>
                  <p className="text-xs text-ink-400">
                    {fmt(dict.catalog.productsCount, { n: section.products.length })}
                  </p>
                </div>
              </Link>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
