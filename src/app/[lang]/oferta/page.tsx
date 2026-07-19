import type { Metadata } from "next";
import { BadgePercent } from "lucide-react";
import rawOffers from "@/data/offers.json";
import { canSeePrices, getSession } from "@/lib/auth";
import {
  getDiscountedProducts,
  getProductBySlug,
  getShowcaseProducts,
  toCardProducts,
} from "@/lib/catalog";
import { isLang, langHref, type Lang } from "@/lib/i18n";
import { getDictionary } from "@/lib/dictionaries";
import { Breadcrumbs } from "@/components/catalog/Breadcrumbs";
import { ProductCard } from "@/components/product/ProductCard";
import { ProductRow } from "@/components/home/ProductRow";

interface Props {
  params: Promise<{ lang: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { lang } = await params;
  const dict = getDictionary(isLang(lang) ? (lang as Lang) : "sq");
  return {
    title: dict.offersPage.title,
    description: dict.offersPage.metaDescription,
    alternates: {
      canonical: langHref(dict.lang, "/oferta"),
      languages: { sq: "/oferta", en: "/en/oferta" },
    },
  };
}

/**
 * Offers = products with a genuine sale price from the export, plus a
 * curated list the business maintains in src/data/offers.json (slugs).
 * No invented discounts: if neither exists, we say so honestly.
 */
export default async function OffersPage({ params }: Props) {
  const { lang } = await params;
  const dict = getDictionary(isLang(lang) ? (lang as Lang) : "sq");
  const session = await getSession();
  const showPrices = canSeePrices(session);

  const curatedResolved = await Promise.all(
    (rawOffers as string[]).map((slug) => getProductBySlug(slug))
  );
  const curated = curatedResolved.filter(
    (p): p is NonNullable<typeof p> => Boolean(p)
  );
  const discounted = (await getDiscountedProducts(48)).filter(
    (p) => !curated.some((c) => c.id === p.id)
  );
  const offers = await toCardProducts([...curated, ...discounted], showPrices);

  const featured = await toCardProducts(
    await getShowcaseProducts(undefined, 8),
    showPrices
  );

  return (
    <div>
      <div className="mx-auto max-w-7xl px-4 py-8 lg:px-6 lg:py-10">
        <Breadcrumbs items={[{ label: dict.offersPage.title }]} dict={dict} />
        <h1 className="mt-4 text-3xl font-extrabold text-ink-900 sm:text-4xl">
          {dict.offersPage.title}
        </h1>
        <p className="mt-2 max-w-2xl text-ink-500">{dict.offersPage.sub}</p>

        {offers.length > 0 ? (
          <ul className="mt-8 grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 xl:grid-cols-4">
            {offers.map((p, i) => (
              <li key={p.id}>
                <ProductCard product={p} dict={dict} priority={i < 4} />
              </li>
            ))}
          </ul>
        ) : (
          <div className="mt-8 flex flex-col items-center rounded-xl border border-dashed border-ink-900/12 bg-white px-6 py-14 text-center">
            <span className="flex size-16 items-center justify-center rounded-full bg-brand-50">
              <BadgePercent className="size-7 text-brand-600" strokeWidth={1.5} aria-hidden />
            </span>
            <h2 className="mt-4 text-lg font-bold text-ink-900">
              {dict.offersPage.emptyTitle}
            </h2>
            <p className="mt-1.5 max-w-md text-sm text-ink-500">
              {dict.offersPage.emptyText}
            </p>
          </div>
        )}
      </div>

      {offers.length === 0 && (
        <ProductRow
          title={dict.home.featuredTitle}
          subtitle={dict.home.featuredSubtitle}
          href="/produktet"
          products={featured}
          dict={dict}
        />
      )}
    </div>
  );
}
