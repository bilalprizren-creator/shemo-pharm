import { Download } from "lucide-react";
import { fmt } from "@/lib/i18n";
import { formatMegabytes } from "@/lib/format";
import type { Dictionary } from "@/lib/dictionaries";
import type { CatalogPdfFile } from "@/katalog/pdf";

/**
 * The link to a catalogue PDF that has already been made.
 *
 * It opens in a tab rather than carrying `download`, and that is the whole
 * point of the change it belongs to. The complaint this answers was that
 * pressing Print took minutes: a browser fetching 1 713 photographs and then
 * typesetting 163 A4 pages. A PDF in a viewer starts drawing its first page
 * while the rest is still arriving, and the viewer has a save button of its
 * own for anybody who wants the file.
 *
 * The page count and the size are on the button, not behind it. 12 MB in a
 * pharmacy on a phone is a decision, and it should be made before the tap.
 */
export function PdfDownload({
  pdf,
  dict,
  tone = "primary",
}: {
  pdf: CatalogPdfFile;
  dict: Dictionary;
  /** `quiet` for the pages where the catalogue is not the main offer. */
  tone?: "primary" | "quiet";
}) {
  const meta = fmt(dict.printedCatalog.pdfMeta, {
    n: pdf.sheets,
    size: formatMegabytes(pdf.bytes, dict.lang === "en" ? "en-GB" : "sq-AL"),
  });

  return (
    <a
      href={pdf.file}
      target="_blank"
      rel="noopener"
      className={
        tone === "primary"
          ? "inline-flex items-center gap-2 rounded-field bg-brand-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand-700"
          : "inline-flex items-center gap-2 rounded-field border border-line bg-white px-4 py-2 text-sm font-medium text-ink-700 transition-colors hover:border-brand-200 hover:text-brand-700"
      }
    >
      <Download className="size-4" aria-hidden />
      {dict.printedCatalog.downloadPdf}
      <span
        className={tone === "primary" ? "font-normal text-brand-100" : "font-normal text-ink-400"}
      >
        · {meta}
      </span>
    </a>
  );
}
