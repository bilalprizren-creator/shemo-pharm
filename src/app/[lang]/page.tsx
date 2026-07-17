import { canSeePrices, getSession } from "@/lib/auth";
import { getShowcaseProducts, toCardProduct } from "@/lib/catalog";
import { isLang, type Lang } from "@/lib/i18n";
import { getDictionary } from "@/lib/dictionaries";
import { Hero } from "@/components/home/Hero";
import { TrustStats } from "@/components/home/TrustStats";
import { CategoryCards } from "@/components/home/CategoryCards";
import { ProductRow } from "@/components/home/ProductRow";
import { UspBand } from "@/components/home/UspBand";
import { AdviceSection } from "@/components/home/AdviceSection";
import { BrandStrip } from "@/components/home/BrandStrip";
import { NewsletterBar } from "@/components/home/NewsletterBar";

export default async function HomePage({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  const dict = getDictionary(isLang(lang) ? (lang as Lang) : "sq");

  const session = await getSession();
  const showPrices = canSeePrices(session);

  const featured = getShowcaseProducts(undefined, 8).map((p) =>
    toCardProduct(p, showPrices)
  );
  const devices = getShowcaseProducts("aparatura", 8).map((p) =>
    toCardProduct(p, showPrices)
  );

  return (
    <>
      <Hero dict={dict} />
      <TrustStats dict={dict} overlap />
      <CategoryCards dict={dict} />
      <ProductRow
        title={dict.home.featuredTitle}
        subtitle={dict.home.featuredSubtitle}
        eyebrow={dict.home.featuredEyebrow}
        href="/produktet"
        products={featured}
        dict={dict}
      />
      <UspBand dict={dict} />
      <AdviceSection dict={dict} />
      <ProductRow
        title={dict.home.devicesTitle}
        subtitle={dict.home.devicesSubtitle}
        eyebrow={dict.home.devicesEyebrow}
        href="/kategorite/aparatura"
        products={devices}
        dict={dict}
        tinted
      />
      <BrandStrip dict={dict} />
      <NewsletterBar dict={dict} />
    </>
  );
}
