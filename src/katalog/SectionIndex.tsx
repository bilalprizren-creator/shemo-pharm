import Image from "next/image";
import { thumbnailFor } from "@/lib/images";
import Link from "next/link";
import { List, Package, Printer, Search } from "lucide-react";
import {
  catalogSectionSlug,
  getAssortmentCounts,
  getCatalogSections,
  getEmptyCatalogSections,
  productImage,
} from "@/lib/catalog";
import { catalogFingerprint, sheetsFor } from "@/katalog/sheets";
import { catalogPdfGeneratedAt, catalogPdfIsCurrent, fullCatalogPdf } from "@/katalog/pdf";
import { PdfDownload } from "@/katalog/PdfDownload";
import { langHref, fmt } from "@/lib/i18n";
import { getSiteMode, shopOrigin, sitePath } from "@/lib/site-mode";
import { formatCount, formatDate } from "@/lib/format";
import { SITE } from "@/lib/site";
import type { Dictionary } from "@/lib/dictionaries";
import { Breadcrumbs } from "@/components/catalog/Breadcrumbs";
import { PhotoWell, PHOTO_SHADOW_SM, photoPresentation } from "@/components/product/PhotoWell";

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
  // Printed, searchable, online: the three ranges this page used to leave the
  // reader to tell apart from bare numbers (see getAssortmentCounts).
  const counts = await getAssortmentCounts();
  const count = (n: number) => formatCount(n, dict.lang);
  // Sections the paper edition prints that the range no longer carries, so the
  // gap between 61 and 63 is explained rather than left to be discovered.
  const missing = await getEmptyCatalogSections();
  // Costs nothing here — getCatalogSections() is already loaded and cached —
  // and 163 is the number that makes somebody print one section instead.
  const sheets = sheetsFor(sections).length;
  // The generated file, when there is one. Everything below falls back to the
  // print sheet without it — a checkout before anybody has run
  // scripts/build-catalog-pdf.mjs is a real state, not a broken one.
  const pdf = fullCatalogPdf();
  const pdfDate = catalogPdfGeneratedAt();
  const pdfCurrent = catalogPdfIsCurrent(catalogFingerprint(sections));

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
            {fmt(dict.printedCatalog.allLink, { n: count(counts.catalogue) })}
          </Link>
          {/* The download leads and the print sheet follows, because the two
              are not equal any more: one is a file the CDN hands over, the
              other is 1 713 photographs and 163 pages for the visitor's own
              browser to typeset. The print sheet stays because it is the only
              version that is current to the minute — and for one section it is
              a perfectly cheap thing to ask for. */}
          {pdf && <PdfDownload pdf={pdf} dict={dict} />}
          <Link
            href={href("/katalog/shtyp")}
            className={
              pdf
                ? "inline-flex items-center gap-2 rounded-field border border-line bg-white px-4 py-2 text-sm font-medium text-ink-700 transition-colors hover:border-brand-200 hover:text-brand-700"
                : "inline-flex items-center gap-2 rounded-field bg-brand-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand-700"
            }
          >
            <Printer className="size-4" aria-hidden />
            {pdf ? dict.printedCatalog.printFromBrowser : dict.printedCatalog.print}
            {!pdf && (
              <span className="font-normal text-brand-100">
                · {fmt(dict.printedCatalog.printPages, { n: sheets })}
              </span>
            )}
          </Link>
        </div>
      </div>

      {/* The catalogue's own search, in the page rather than behind a button:
          looking a printed code up is what most visitors come here to do. A
          plain GET form, so it works with scripting off; the results page
          (InstantSearch) takes over from there. On both domains — on the
          shop's, the header search goes to the shop's listing instead. */}
      <form
        action={href("/katalog/kerko")}
        role="search"
        className="mt-6 flex max-w-2xl items-center gap-2 rounded-full border border-line bg-white py-1.5 pl-4 pr-1.5 shadow-card transition-colors focus-within:border-brand-300 focus-within:ring-2 focus-within:ring-brand-500/20"
      >
        <Search className="size-5 shrink-0 text-ink-400" aria-hidden />
        <input
          type="search"
          name="kerko"
          placeholder={dict.printedCatalog.searchPlaceholder}
          aria-label={dict.printedCatalog.searchInstead}
          className="min-w-0 flex-1 bg-transparent py-2 text-base text-ink-900 outline-none! placeholder:text-ink-400"
        />
        <button
          type="submit"
          className="shrink-0 rounded-full bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-700"
        >
          {dict.search.button}
        </button>
      </form>

      {pdf && pdfDate && (
        <p className="mt-4 text-sm text-ink-400">
          {fmt(dict.printedCatalog.pdfDated, {
            date: formatDate(pdfDate, dict.lang === "en" ? "en-GB" : "sq-AL"),
          })}
          {/* The file is a stored artefact and can fall behind the database.
              catalogFingerprint() is how the page knows, so a partner is told
              rather than left to find out from a code that is not in it. */}
          {!pdfCurrent && <> · {dict.printedCatalog.pdfStale}</>}
          {SITE.katalogPdfMirror && (
            <>
              {" · "}
              <a
                href={SITE.katalogPdfMirror}
                target="_blank"
                rel="noopener"
                className="underline decoration-line underline-offset-2 transition-colors hover:text-brand-700"
              >
                {dict.printedCatalog.pdfMirror}
              </a>
            </>
          )}
        </p>
      )}

      {/* Three numbers that used to stand on three different pages with
          nothing to say what each counted. Side by side, each labelled with
          its range, the difference is the explanation. */}
      <section
        aria-labelledby="katalog-scope"
        className="mt-6 rounded-2xl border border-line bg-white p-5"
      >
        <h2
          id="katalog-scope"
          className="text-sm font-bold uppercase tracking-wide text-ink-900"
        >
          {dict.printedCatalog.scopeTitle}
        </h2>
        <dl className="mt-4 grid gap-4 sm:grid-cols-3">
          <div className="flex flex-col-reverse gap-0.5">
            <dt className="text-sm text-ink-500">
              {fmt(dict.printedCatalog.scopePrinted, { sections: counts.sections })}
            </dt>
            <dd className="font-display text-2xl font-bold text-brand-700">
              {count(counts.printed)}
            </dd>
          </div>
          <div className="flex flex-col-reverse gap-0.5">
            <dt className="text-sm text-ink-500">
              {fmt(dict.printedCatalog.scopeSearchable, { unplaced: count(counts.unplaced) })}
            </dt>
            <dd className="font-display text-2xl font-bold text-brand-700">
              <Link
                href={href("/katalog/te-gjitha")}
                className="underline decoration-brand-200 underline-offset-4 hover:text-brand-800"
              >
                {count(counts.catalogue)}
              </Link>
            </dd>
          </div>
          <div className="flex flex-col-reverse gap-0.5">
            <dt className="text-sm text-ink-500">{dict.printedCatalog.scopeOnline}</dt>
            <dd className="font-display text-2xl font-bold text-accent-700">
              <a
                href={`${shopOrigin(mode)}${langHref(dict.lang, "/produktet")}`}
                className="underline decoration-accent-200 underline-offset-4 hover:text-accent-800"
              >
                {count(counts.online)}
              </a>
            </dd>
          </div>
        </dl>
        <p className="mt-4 max-w-3xl text-sm leading-relaxed text-ink-500">
          {fmt(dict.printedCatalog.scopeExplain, { onlineOnly: count(counts.onlineOnly) })}
        </p>
      </section>

      {missing.length > 0 && (
        <p className="mt-4 max-w-3xl text-sm text-ink-500">
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
                {/* Was an unconditional `bg-surface`, which is the one thing a
                    product well must never be: ivory behind an uncut photo
                    shows its white rectangle as a hard box, and the first
                    product of a section is as likely as any to be one of the
                    sixteen. */}
                <PhotoWell
                  className="flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-xl"
                >
                  {cover ? (
                    <Image
                      src={thumbnailFor(cover)}
                      alt=""
                      fill
                      sizes="64px"
                      priority={i < 6}
                      className={
                        photoPresentation(cover, { pad: "p-2", shadow: PHOTO_SHADOW_SM }).className
                      }
                    />
                  ) : (
                    <Package className="size-6 text-ink-300" strokeWidth={1.25} aria-hidden />
                  )}
                </PhotoWell>
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
