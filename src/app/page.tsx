import { canSeePrices, getSession } from "@/lib/auth";
import {
  getProductBySlug,
  getShowcaseProducts,
  toCardProduct,
} from "@/lib/catalog";
import { Hero, type HeroProduct } from "@/components/home/Hero";
import { TrustStats } from "@/components/home/TrustStats";
import { CategoryCards } from "@/components/home/CategoryCards";
import { ProductRow } from "@/components/home/ProductRow";
import { AboutSection } from "@/components/home/AboutSection";
import { BrandStrip } from "@/components/home/BrandStrip";
import { ContactCta } from "@/components/home/ContactCta";

/** Real catalog products shown in the hero composition. */
const HERO_SLUGS = [
  "mesh-nebulizer-shm-200-0013",
  "pulse-oximeter-fingertip-0111",
  "2106-termometer-digjital-flexibil-senti-2",
];

export default async function HomePage() {
  const session = await getSession();
  const showPrices = canSeePrices(session);

  const heroProducts: HeroProduct[] = HERO_SLUGS.flatMap((slug) => {
    const p = getProductBySlug(slug);
    return p && p.images[0]
      ? [{ name: p.name, slug: p.slug, image: p.images[0] }]
      : [];
  });

  const featured = getShowcaseProducts(undefined, 8).map((p) =>
    toCardProduct(p, showPrices)
  );
  const devices = getShowcaseProducts("aparatura", 8).map((p) =>
    toCardProduct(p, showPrices)
  );
  const personalCare = getShowcaseProducts("kozmetike", 8).map((p) =>
    toCardProduct(p, showPrices)
  );

  return (
    <>
      <Hero products={heroProducts} />
      <TrustStats />
      <CategoryCards />
      <ProductRow
        title="Produktet e veçuara"
        subtitle="Një përzgjedhje nga katalogu ynë"
        href="/produktet"
        products={featured}
      />
      <ProductRow
        title="Pajisje dhe aparatura mjekësore"
        subtitle="Teknologji mjekësore për përdorim profesional dhe shtëpiak"
        href="/kategorite/aparatura"
        products={devices}
        tinted
      />
      <ProductRow
        title="Kujdesi personal"
        subtitle="Kozmetikë dhe produkte për higjienën e përditshme"
        href="/kategorite/kozmetike"
        products={personalCare}
      />
      <AboutSection />
      <BrandStrip />
      <ContactCta />
    </>
  );
}
