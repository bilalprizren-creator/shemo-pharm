import type { Metadata } from "next";
import { BadgePercent } from "lucide-react";
import rawOffers from "@/data/offers.json";
import { canSeePrices, getSession } from "@/lib/auth";
import {
  getDiscountedProducts,
  getProductBySlug,
  getShowcaseProducts,
  toCardProduct,
} from "@/lib/catalog";
import { Breadcrumbs } from "@/components/catalog/Breadcrumbs";
import { ProductCard } from "@/components/product/ProductCard";
import { ProductRow } from "@/components/home/ProductRow";

export const metadata: Metadata = {
  title: "Oferta",
  description:
    "Ofertat aktuale të SHEMO PHARM — produkte me çmime të veçanta për barnatore dhe partnerë biznesi.",
  alternates: { canonical: "/oferta" },
};

/**
 * Offers = products with a genuine sale price from the export, plus a
 * curated list the business maintains in src/data/offers.json (slugs).
 * No invented discounts: if neither exists, we say so honestly.
 */
export default async function OffersPage() {
  const session = await getSession();
  const showPrices = canSeePrices(session);

  const curated = (rawOffers as string[])
    .map((slug) => getProductBySlug(slug))
    .filter((p): p is NonNullable<typeof p> => Boolean(p));
  const discounted = getDiscountedProducts(48).filter(
    (p) => !curated.some((c) => c.id === p.id)
  );
  const offers = [...curated, ...discounted].map((p) =>
    toCardProduct(p, showPrices)
  );

  const featured = getShowcaseProducts(undefined, 8).map((p) =>
    toCardProduct(p, showPrices)
  );

  return (
    <div>
      <div className="mx-auto max-w-7xl px-4 py-8 lg:px-6 lg:py-10">
        <Breadcrumbs items={[{ label: "Oferta" }]} />
        <h1 className="mt-4 text-3xl font-extrabold text-ink-900 sm:text-4xl">
          Oferta
        </h1>
        <p className="mt-2 max-w-2xl text-ink-500">
          Produkte me çmime të veçanta për barnatore dhe partnerë biznesi.
        </p>

        {offers.length > 0 ? (
          <ul className="mt-8 grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 xl:grid-cols-4">
            {offers.map((p, i) => (
              <li key={p.id}>
                <ProductCard product={p} priority={i < 4} />
              </li>
            ))}
          </ul>
        ) : (
          <div className="mt-8 flex flex-col items-center rounded-xl border border-dashed border-ink-900/12 bg-white px-6 py-14 text-center">
            <span className="flex size-16 items-center justify-center rounded-full bg-brand-50">
              <BadgePercent className="size-7 text-brand-600" strokeWidth={1.5} aria-hidden />
            </span>
            <h2 className="mt-4 text-lg font-bold text-ink-900">
              Momentalisht nuk ka oferta aktive
            </h2>
            <p className="mt-1.5 max-w-md text-sm text-ink-500">
              Ofertat e reja publikohen këtu. Ndërkohë, hidhini një sy
              produkteve tona të veçuara — ose na kontaktoni për kushtet e
              porosive me shumicë.
            </p>
          </div>
        )}
      </div>

      {offers.length === 0 && (
        <ProductRow
          title="Produktet e Veçuara"
          subtitle="Një përzgjedhje nga katalogu ynë"
          href="/produktet"
          products={featured}
        />
      )}
    </div>
  );
}
