import Link from "next/link";
import type { Category } from "@/lib/types";
import type { ProductFacts } from "@/lib/product-facts";
import type { Dictionary } from "@/lib/dictionaries";
import { langHref } from "@/lib/i18n";

/**
 * The spec table on a product page.
 *
 * Two sources, both of them evidence rather than copywriting: the brand comes
 * off the packshot audit (a mark somebody read on the package), the rest is
 * parsed back out of the product's own name by src/lib/product-facts.ts. A
 * product with neither renders nothing at all — an empty table headed "Product
 * details" promises information the catalog does not have.
 */
export function ProductSpecs({
  facts,
  brand,
  brandName,
  dict,
}: {
  facts: ProductFacts;
  /** The brand shelf, so the row can link to the rest of the range. */
  brand: Category | null;
  brandName: string | null;
  dict: Dictionary;
}) {
  const rows: { label: string; value: React.ReactNode; key: string }[] = [];

  if (brand && brandName) {
    rows.push({
      key: "brand",
      label: dict.product.brandLabel,
      value: (
        <Link
          href={langHref(dict.lang, `/kategorite/${brand.slug}`)}
          className="font-semibold text-brand-700 underline-offset-2 hover:underline"
        >
          {brandName}
        </Link>
      ),
    });
  }
  if (facts.pack) {
    rows.push({
      key: "pack",
      label: dict.product.packLabel,
      value: `${facts.pack.count} ${dict.product.packUnits[facts.pack.unit]}`,
    });
  }
  if (facts.volume) {
    rows.push({ key: "volume", label: dict.product.volumeLabel, value: facts.volume });
  }
  if (facts.weight) {
    rows.push({ key: "weight", label: dict.product.weightLabel, value: facts.weight });
  }
  if (facts.strength) {
    rows.push({
      key: "strength",
      label: dict.product.strengthLabel,
      value: facts.strength,
    });
  }
  if (facts.dimensions) {
    rows.push({
      key: "dimensions",
      label: dict.product.dimensionsLabel,
      value: facts.dimensions,
    });
  }
  if (facts.spf) {
    rows.push({ key: "spf", label: dict.product.spfLabel, value: `SPF ${facts.spf}` });
  }
  if (facts.sizes.length) {
    rows.push({
      key: "sizes",
      label: dict.product.sizesLabel,
      value: facts.sizes.join(" · "),
    });
  }
  if (facts.compression) {
    rows.push({
      key: "compression",
      label: dict.product.compressionLabel,
      value: facts.compression,
    });
  }

  if (rows.length === 0) return null;

  return (
    <section className="mt-6">
      <h2 className="text-sm font-bold uppercase tracking-wide text-ink-900">
        {dict.product.specsHeading}
      </h2>
      <dl className="mt-3 divide-y divide-ink-900/6 rounded-xl border border-ink-900/8 bg-white text-[15px]">
        {rows.map((row) => (
          <div
            key={row.key}
            className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 px-4 py-2.5"
          >
            <dt className="text-ink-500">{row.label}</dt>
            <dd className="font-semibold text-ink-900">{row.value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
