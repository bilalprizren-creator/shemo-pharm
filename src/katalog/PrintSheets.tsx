import Image from "next/image";
import { printImageFor } from "@/lib/images";
import Link from "next/link";
import { ArrowLeft, Package } from "lucide-react";
import { SITE } from "@/lib/site";
import { langHref, fmt } from "@/lib/i18n";
import { formatDate } from "@/lib/format";
import { getSiteMode, sitePath } from "@/lib/site-mode";
import {
  catalogSectionSlug,
  productDisplayName,
  productImage,
  type CatalogSectionWithProducts,
} from "@/lib/catalog";
import type { Dictionary } from "@/lib/dictionaries";
import { PrintButton } from "@/katalog/PrintButton";
import { catalogFingerprint, sheetsFor } from "@/katalog/sheets";
import { fullCatalogPdf, sectionCatalogPdf } from "@/katalog/pdf";
import { PdfDownload } from "@/katalog/PdfDownload";

/**
 * The printed catalogue as A4 sheets, ready for the browser's print dialog.
 *
 * Rebuilds the geometry of the paper edition — twelve products to a sheet,
 * three across, a new sheet per section — out of a grid and borders. The old
 * site drew the same thing with a 1600x2263 PNG behind every one of its 174
 * pages, so nothing here has to be redrawn when the range changes.
 *
 * No prices, deliberately, and not because of the login: the paper edition
 * carries none either, and a price printed onto a sheet that lives in a
 * customer's drawer for a year is worse than no price at all.
 */
export async function PrintSheets({
  sections,
  dict,
}: {
  sections: CatalogSectionWithProducts[];
  dict: Dictionary;
}) {
  const mode = await getSiteMode();
  const sheets = sheetsFor(sections);
  // The file that matches this run: one section's when that is what was asked
  // for, otherwise the whole catalogue. Null before the first generation.
  const pdf =
    sections.length === 1
      ? sectionCatalogPdf(catalogSectionSlug(sections[0]))
      : fullCatalogPdf();
  const printedAt = formatDate(new Date(), dict.lang === "en" ? "en-GB" : "sq-AL");

  return (
    // The two data attributes are read by scripts/build-catalog-pdf.mjs, which
    // renders this page in a headless browser: the fingerprint goes into the
    // manifest so the site can tell when a stored PDF has fallen behind the
    // database, and the per-sheet slug is how the script learns which sections
    // exist and how many sheets each one takes, from one load instead of
    // sixty-two.
    <div className="bg-surface-deep py-6" data-fingerprint={catalogFingerprint(sections)}>
      <div className="print-hide mx-auto mb-6 flex max-w-[190mm] flex-wrap items-center justify-between gap-3 px-4">
        <Link
          href={langHref(dict.lang, sitePath(mode, "/katalog"))}
          className="inline-flex items-center gap-2 text-sm font-medium text-ink-700 transition-colors hover:text-brand-700"
        >
          <ArrowLeft className="size-4" aria-hidden />
          {dict.printedCatalog.title}
        </Link>
        <div className="flex flex-wrap items-center gap-2">
          {/* Somebody who reached this page is already waiting for photographs.
              The finished file is the shorter way to the same thing, and this
              is the last moment it is any use to say so. */}
          {pdf && <PdfDownload pdf={pdf} dict={dict} tone="quiet" />}
          <PrintButton
            label={dict.printedCatalog.print}
            waitingLabel={dict.printedCatalog.printWaiting}
            progressLabel={dict.printedCatalog.printProgress}
          />
        </div>
        <p className="w-full text-sm text-ink-500">
          {dict.printedCatalog.printIntro} · {fmt(dict.printedCatalog.printPages, { n: sheets.length })}
        </p>
      </div>

      {sheets.map((sheet) => (
        <article
          key={`${sheet.section.id}-${sheet.index}`}
          className="print-sheet"
          data-section={catalogSectionSlug(sheet.section)}
        >
          <header className="mb-[6mm] flex items-baseline gap-3 border-b border-line pb-[3mm]">
            <span className="print-keep-color rounded bg-accent-500 px-2 py-0.5 font-mono text-sm font-bold text-accent-950">
              {sheet.section.catalogNo}
            </span>
            <h2 className="text-lg font-bold text-ink-900">{sheet.section.name}</h2>
          </header>

          <div className="print-grid">
            {sheet.products.map((product) => {
              const image = productImage(product);
              return (
                <div key={product.id} className="print-cell flex flex-col items-center">
                  <div className="relative flex h-[30mm] w-full items-center justify-center">
                    {image ? (
                      <Image
                        // The 384px print copy — not the 560px thumbnail the
                        // shop's grid uses, and not the 1000px original.
                        // next/image stopped resizing anything when
                        // images.unoptimized went on, so the width below no
                        // longer builds a srcset: it only sizes the box, and
                        // the browser fetches whatever this src names. A full
                        // run is 1 713 photographs, and it was 69 MB of
                        // originals before the print dialog even opened, on a
                        // phone, in a pharmacy. 384px across 30mm is 325 dpi.
                        //
                        // JPEG rather than WebP, which is the one thing here
                        // that is not a preference: these sheets are turned
                        // into a PDF by scripts/build-catalog-pdf.mjs, and
                        // Chrome can only carry a JPEG through untouched. See
                        // printImageFor().
                        src={printImageFor(image)}
                        alt=""
                        width={192}
                        height={192}
                        // Eager throughout: an image the browser has not
                        // fetched yet prints as blank space, and a print run
                        // never scrolls to trigger lazy loading. PrintButton
                        // waits for all of them before opening the dialog.
                        loading="eager"
                        className="max-h-full w-auto object-contain"
                      />
                    ) : (
                      <Package className="size-8 text-ink-300" strokeWidth={1.25} aria-hidden />
                    )}
                  </div>
                  <p className="print-keep-color mt-[2mm] self-start rounded bg-accent-100 px-1.5 font-mono text-[10px] font-bold text-accent-900">
                    {product.sku}
                  </p>
                  <p className="mt-[1mm] w-full text-center text-[11px] leading-tight text-ink-900">
                    {productDisplayName(product)}
                  </p>
                </div>
              );
            })}
          </div>

          {/* Without this a rep holding 163 loose sheets has no way to put one
              back, and no way to tell this year's run from last year's. */}
          <footer className="print-sheet-foot">
            <span>{SITE.name}</span>
            <span>
              {sheet.section.catalogNo} {sheet.section.name}
            </span>
            <span>
              {fmt(dict.printedCatalog.printPage, {
                page: sheet.index,
                total: sheets.length,
              })}{" "}
              · {printedAt}
            </span>
          </footer>
        </article>
      ))}
    </div>
  );
}
