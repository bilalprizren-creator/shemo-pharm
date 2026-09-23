import type { Metadata } from "next";
import { canSeePrices, getSession } from "@/lib/auth";
import { getAssortmentCounts, getFeaturedProducts, toCardProducts } from "@/lib/catalog";
import { roundDownCount } from "@/lib/format";
import { isLang, langHref, type Lang } from "@/lib/i18n";
import { getDictionary } from "@/lib/dictionaries";
import { Hero } from "@/components/home/Hero";
import { TrustStats } from "@/components/home/TrustStats";
import { BrandStrip } from "@/components/home/BrandStrip";
import { CategoryGrid } from "@/components/home/CategoryGrid";
import { WhyShemo } from "@/components/home/WhyShemo";
import { NetworkSection } from "@/components/home/NetworkSection";
import { FeaturedProducts } from "@/components/home/FeaturedProducts";
import { AdviceSection } from "@/components/home/AdviceSection";

/**
 * Title and description are inherited from the layout — only the canonical and
 * the language alternates are set here, so / and /en each declare themselves.
 */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string }>;
}): Promise<Metadata> {
  const { lang } = await params;
  const dict = getDictionary(isLang(lang) ? (lang as Lang) : "sq");
  return {
    alternates: {
      canonical: langHref(dict.lang, "/"),
      languages: { sq: "/", en: "/en" },
    },
  };
}

export default async function HomePage({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  const dict = getDictionary(isLang(lang) ? (lang as Lang) : "sq");

  const session = await getSession();
  const showPrices = canSeePrices(session);

  const featured = await toCardProducts(
    await getFeaturedProducts(4),
    showPrices
  );
  // The online range, counted: exact on the button that leads to it, rounded
  // down where it stands beside a "+".
  const { online } = await getAssortmentCounts();

  return (
    <>
      <Hero dict={dict} productCount={roundDownCount(online)} />
      <TrustStats dict={dict} productCount={roundDownCount(online)} />
      <BrandStrip dict={dict} />
      <CategoryGrid dict={dict} />
      <WhyShemo dict={dict} />
      <NetworkSection dict={dict} />
      <FeaturedProducts products={featured} productCount={online} dict={dict} />
      <AdviceSection dict={dict} />
    </>
  );
}
