import type { Metadata } from "next";
import { canSeePrices, getSession } from "@/lib/auth";
import { getFeaturedProducts, toCardProducts } from "@/lib/catalog";
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

  return (
    <>
      <Hero dict={dict} />
      <TrustStats dict={dict} />
      <BrandStrip dict={dict} />
      <CategoryGrid dict={dict} />
      <WhyShemo dict={dict} />
      <NetworkSection dict={dict} />
      <FeaturedProducts products={featured} dict={dict} />
      <AdviceSection dict={dict} />
    </>
  );
}
