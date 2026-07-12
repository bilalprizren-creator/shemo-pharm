import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  BadgeCheck,
  CircleOff,
  Lock,
  Mail,
  MessageCircle,
  Phone,
} from "lucide-react";
import { canSeePrices, getSession } from "@/lib/auth";
import {
  categoryDisplayName,
  getAllCategories,
  getProductBySlug,
  getRelatedProducts,
  primaryCategory,
  toCardProduct,
} from "@/lib/catalog";
import { formatPrice } from "@/lib/format";
import { SITE } from "@/lib/site";
import { Breadcrumbs, type Crumb } from "@/components/catalog/Breadcrumbs";
import { BreadcrumbJsonLd, ProductJsonLd } from "@/components/seo/JsonLd";
import { ProductCard } from "@/components/product/ProductCard";
import { ProductCarousel } from "@/components/product/ProductCarousel";
import { ProductGallery } from "@/components/product/ProductGallery";
import { WishlistButton } from "@/components/product/WishlistButton";
import { AddToCartWithQty } from "@/components/cart/AddToCartButton";

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const product = getProductBySlug(slug);
  if (!product) return {};
  const cat = primaryCategory(product);
  return {
    title: product.name,
    description: `${product.name}${cat ? ` — ${categoryDisplayName(cat)}` : ""}. Produkt nga katalogu i SHEMO PHARM, distributor me shumicë i produkteve dhe pajisjeve mjekësore në Kosovë.`,
    alternates: { canonical: `/produktet/${slug}` },
    openGraph: product.images[0]
      ? { images: [{ url: product.images[0] }] }
      : undefined,
  };
}

export default async function ProductPage({ params }: Props) {
  const { slug } = await params;
  const product = getProductBySlug(slug);
  if (!product) notFound();

  const session = await getSession();
  const showPrices = canSeePrices(session);

  const all = getAllCategories();
  const productCategories = all.filter((c) => product.categoryIds.includes(c.id));
  const mainCat = productCategories[0];

  const crumbs: Crumb[] = [
    { label: "Produktet", href: "/produktet" },
    ...(mainCat
      ? [{ label: categoryDisplayName(mainCat), href: `/kategorite/${mainCat.slug}` }]
      : []),
    { label: product.name },
  ];

  const related = getRelatedProducts(product, 8).map((p) =>
    toCardProduct(p, showPrices)
  );

  const whatsappText = encodeURIComponent(
    `Përshëndetje! Jam i interesuar për produktin: ${product.name}${
      product.sku ? ` (Kodi: ${product.sku})` : ""
    }`
  );
  const mailSubject = encodeURIComponent(`Kërkesë për produktin: ${product.name}`);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 lg:px-6 lg:py-10">
      <ProductJsonLd
        name={product.name}
        sku={product.sku}
        image={product.images[0] ?? null}
        category={mainCat ? categoryDisplayName(mainCat) : null}
        slug={product.slug}
      />
      <BreadcrumbJsonLd
        items={[
          { name: "Ballina", url: "/" },
          { name: "Produktet", url: "/produktet" },
          ...(mainCat
            ? [{ name: categoryDisplayName(mainCat), url: `/kategorite/${mainCat.slug}` }]
            : []),
          { name: product.name },
        ]}
      />
      <Breadcrumbs items={crumbs} />

      <div className="mt-6 grid gap-8 lg:grid-cols-2 lg:gap-12">
        <ProductGallery images={product.images} name={product.name} />

        <div>
          {mainCat && (
            <Link
              href={`/kategorite/${mainCat.slug}`}
              className="text-xs font-semibold uppercase tracking-wider text-brand-700 hover:text-brand-800"
            >
              {categoryDisplayName(mainCat)}
            </Link>
          )}
          <h1 className="mt-2 text-2xl font-extrabold leading-tight text-ink-900 sm:text-3xl">
            {product.name}
          </h1>

          <dl className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-ink-500">
            {product.sku && (
              <div className="flex gap-1.5">
                <dt>Kodi i produktit:</dt>
                <dd className="font-semibold text-ink-700">{product.sku}</dd>
              </div>
            )}
            <div className="flex items-center gap-1.5">
              <dt className="sr-only">Disponueshmëria:</dt>
              {product.inStock ? (
                <dd className="flex items-center gap-1.5 font-medium text-brand-700">
                  <BadgeCheck className="size-4" aria-hidden />
                  Në stok
                </dd>
              ) : (
                <dd className="flex items-center gap-1.5 font-medium text-ink-400">
                  <CircleOff className="size-4" aria-hidden />
                  Pa stok
                </dd>
              )}
            </div>
          </dl>

          <div className="mt-6 rounded-xl border border-ink-900/8 bg-white p-5">
            {showPrices ? (
              <>
                <p className="text-sm text-ink-400">Çmimi me shumicë</p>
                <p className="mt-1 flex items-baseline gap-2.5">
                  <span className="text-3xl font-extrabold text-ink-900">
                    {formatPrice(product.priceCents)}
                  </span>
                  {product.regularCents > product.priceCents && (
                    <s className="text-base font-medium text-ink-300">
                      {formatPrice(product.regularCents)}
                    </s>
                  )}
                </p>
              </>
            ) : (
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="flex items-center gap-2 font-medium text-ink-700">
                  <Lock className="size-4.5 text-brand-600" aria-hidden />
                  Çmimet janë të dukshme vetëm për klientët e kyçur
                </p>
                <Link
                  href="/kycu"
                  className="inline-flex min-h-11 items-center rounded-lg bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-700"
                >
                  Kyçu për të parë çmimin
                </Link>
              </div>
            )}
            <div className="mt-4 border-t border-ink-900/6 pt-4">
              <AddToCartWithQty productId={product.id} productName={product.name} />
            </div>
          </div>

          {(product.shortDescription || product.description) && (
            <div className="mt-6 space-y-3 text-[15px] leading-relaxed text-ink-500">
              {product.shortDescription && <p>{product.shortDescription}</p>}
              {product.description &&
                product.description !== product.shortDescription && (
                  <p>{product.description}</p>
                )}
            </div>
          )}

          <div className="mt-8">
            <h2 className="text-sm font-bold uppercase tracking-wide text-ink-900">
              Porositni ose kërkoni informacion
            </h2>
            <div className="mt-3 flex flex-wrap gap-2.5">
              <a
                href={`${SITE.whatsapp}?text=${whatsappText}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex min-h-12 items-center gap-2 rounded-full bg-brand-600 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-brand-700"
              >
                <MessageCircle className="size-4.5" aria-hidden />
                Porosit përmes WhatsApp
              </a>
              <a
                href={SITE.phones[0].href}
                className="inline-flex min-h-12 items-center gap-2 rounded-full border border-ink-900/12 bg-white px-5 py-3 text-sm font-semibold text-ink-900 transition-colors hover:border-brand-400 hover:text-brand-700"
              >
                <Phone className="size-4.5 text-brand-600" aria-hidden />
                Na telefononi
              </a>
              <a
                href={`mailto:${SITE.emails[0]}?subject=${mailSubject}`}
                className="inline-flex min-h-12 items-center gap-2 rounded-full border border-ink-900/12 bg-white px-5 py-3 text-sm font-semibold text-ink-900 transition-colors hover:border-brand-400 hover:text-brand-700"
              >
                <Mail className="size-4.5 text-brand-600" aria-hidden />
                Email
              </a>
              <WishlistButton
                productId={product.id}
                productName={product.name}
                className="size-12"
              />
            </div>
          </div>

          <p className="mt-8 rounded-xl bg-lavender px-4 py-3 text-[13px] leading-relaxed text-ink-500">
            Për informacion të detajuar mbi produktin, disponueshmërinë dhe
            kushtet e porosisë me shumicë, kontaktoni ekipin e SHEMO PHARM.
          </p>
        </div>
      </div>

      {related.length > 0 && (
        <section aria-label="Produkte të ngjashme" className="mt-16">
          <h2 className="mb-6 text-2xl font-extrabold text-ink-900">
            Produkte të ngjashme
          </h2>
          <ProductCarousel label="Produkte të ngjashme">
            {related.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </ProductCarousel>
        </section>
      )}
    </div>
  );
}
