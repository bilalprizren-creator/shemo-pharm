import { canSeePrices, getSession } from "@/lib/auth";
import { getShowcaseProducts, toCardProduct } from "@/lib/catalog";
import { Hero } from "@/components/home/Hero";
import { TrustStats } from "@/components/home/TrustStats";
import { CategoryCards } from "@/components/home/CategoryCards";
import { ProductRow } from "@/components/home/ProductRow";
import { UspBand } from "@/components/home/UspBand";
import { AdviceSection } from "@/components/home/AdviceSection";
import { BrandStrip } from "@/components/home/BrandStrip";
import { NewsletterBar } from "@/components/home/NewsletterBar";

export default async function HomePage() {
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
      <Hero />
      <TrustStats overlap />
      <CategoryCards />
      <ProductRow
        title="Produktet e Veçuara"
        subtitle="Një përzgjedhje nga katalogu ynë"
        eyebrow="Të zgjedhura për ju"
        href="/produktet"
        products={featured}
      />
      <UspBand />
      <AdviceSection />
      <ProductRow
        title="Pajisje dhe aparatura mjekësore"
        subtitle="Teknologji mjekësore për përdorim profesional dhe shtëpiak"
        eyebrow="Aparatura"
        href="/kategorite/aparatura"
        products={devices}
        tinted
      />
      <BrandStrip />
      <NewsletterBar />
    </>
  );
}
