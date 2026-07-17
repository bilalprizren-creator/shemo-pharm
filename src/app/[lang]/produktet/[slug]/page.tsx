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
import { isLang, langHref, fmt, type Lang } from "@/lib/i18n";
import { getDictionary } from "@/lib/dictionaries";
import { Breadcrumbs, type Crumb } from "@/components/catalog/Breadcrumbs";
import { BreadcrumbJsonLd, ProductJsonLd } from "@/components/seo/JsonLd";
import { ProductCard } from "@/components/product/ProductCard";
import { ProductCarousel } from "@/components/product/ProductCarousel";
import { ProductGallery } from "@/components/product/ProductGallery";
import { WishlistButton } from "@/components/product/WishlistButton";
import { AddToCartWithQty } from "@/components/cart/AddToCartButton";

interface Props {
  params: Promise<{ lang: string; slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { lang, slug } = await params;
  const dict = getDictionary(isLang(lang) ? (lang as Lang) : "sq");
  const product = getProductBySlug(slug);
  if (!product) return {};
  const cat = primaryCategory(product);
  return {
    title: product.name,
    description: `${product.name}${cat ? ` — ${categoryDisplayName(cat)}` : ""}. ${dict.site.description}`,
    alternates: {
      canonical: langHref(dict.lang, `/produktet/${slug}`),
      languages: {
        sq: `/produktet/${slug}`,
        en: `/en/produktet/${slug}`,
      },
    },
    openGraph: product.images[0]
      ? { images: [{ url: product.images[0] }] }
      : undefined,
  };
}

export default async function ProductPage({ params }: Props) {
  const { lang, slug } = await params;
  const dict = getDictionary(isLang(lang) ? (lang as Lang) : "sq");
  const product = getProductBySlug(slug);
  if (!product) notFound();

  const session = await getSession();
  const showPrices = canSeePrices(session);

  const all = getAllCategories();
  const productCategories = all.filter((c) => product.categoryIds.includes(c.id));
  const mainCat = productCategories[0];

  const crumbs: Crumb[] = [
    { label: dict.catalog.title, href: "/produktet" },
    ...(mainCat
      ? [{ label: categoryDisplayName(mainCat), href: `/kategorite/${mainCat.slug}` }]
      : []),
    { label: product.name },
  ];

  const related = getRelatedProducts(product, 8).map((p) =>
    toCardProduct(p, showPrices)
  );

  const whatsappText = encodeURIComponent(
    `${fmt(dict.product.whatsappInterest, { name: product.name })}${
      product.sku ? ` (${dict.common.code}: ${product.sku})` : ""
    }`
  );
  const mailSubject = encodeURIComponent(
    fmt(dict.product.mailSubject, { name: product.name })
  );

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
          { name: dict.nav.home, url: langHref(dict.lang, "/") },
          { name: dict.catalog.title, url: langHref(dict.lang, "/produktet") },
          ...(mainCat
            ? [
                {
                  name: categoryDisplayName(mainCat),
                  url: langHref(dict.lang, `/kategorite/${mainCat.slug}`),
                },
              ]
            : []),
          { name: product.name },
        ]}
      />
      <Breadcrumbs items={crumbs} dict={dict} />

      <div className="mt-6 grid gap-8 lg:grid-cols-2 lg:gap-12">
        <ProductGallery
          images={product.images}
          name={product.name}
          labels={{
            list: dict.product.galleryLabel,
            image: dict.product.galleryImage,
          }}
        />

        <div>
          {mainCat && (
            <Link
              href={langHref(dict.lang, `/kategorite/${mainCat.slug}`)}
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
                <dt>{dict.product.codeLabel}</dt>
                <dd className="font-semibold text-ink-700">{product.sku}</dd>
              </div>
            )}
            <div className="flex items-center gap-1.5">
              <dt className="sr-only">{dict.product.availability}</dt>
              {product.inStock ? (
                <dd className="flex items-center gap-1.5 font-medium text-brand-700">
                  <BadgeCheck className="size-4" aria-hidden />
                  {dict.product.inStock}
                </dd>
              ) : (
                <dd className="flex items-center gap-1.5 font-medium text-ink-400">
                  <CircleOff className="size-4" aria-hidden />
                  {dict.product.outOfStock}
                </dd>
              )}
            </div>
          </dl>

          <div className="mt-6 rounded-xl border border-ink-900/8 bg-white p-5">
            {showPrices ? (
              <>
                <p className="text-sm text-ink-400">{dict.product.wholesalePrice}</p>
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
                  {dict.product.pricesHidden}
                </p>
                <Link
                  href={langHref(dict.lang, "/kycu")}
                  className="inline-flex min-h-11 items-center rounded-full bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-700"
                >
                  {dict.product.loginToSeePrice}
                </Link>
              </div>
            )}
            <div className="mt-4 border-t border-ink-900/6 pt-4">
              <AddToCartWithQty
                productId={product.id}
                labels={{
                  add: dict.product.addToCart,
                  added: dict.product.addedToCart,
                  addAria: fmt(dict.product.addToCartAria, { name: product.name }),
                  increase: dict.product.increaseQty,
                  decrease: dict.product.decreaseQty,
                  qty: dict.product.qtyLabel,
                }}
              />
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
              {dict.product.orderHeading}
            </h2>
            <div className="mt-3 flex flex-wrap gap-2.5">
              <a
                href={`${SITE.whatsapp}?text=${whatsappText}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex min-h-12 items-center gap-2 rounded-full bg-brand-600 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-brand-700"
              >
                <MessageCircle className="size-4.5" aria-hidden />
                {dict.product.orderWhatsapp}
              </a>
              <a
                href={SITE.phones[0].href}
                className="inline-flex min-h-12 items-center gap-2 rounded-full border border-ink-900/12 bg-white px-5 py-3 text-sm font-semibold text-ink-900 transition-colors hover:border-brand-400 hover:text-brand-700"
              >
                <Phone className="size-4.5 text-brand-600" aria-hidden />
                {dict.product.callUs}
              </a>
              <a
                href={`mailto:${SITE.emails[0]}?subject=${mailSubject}`}
                className="inline-flex min-h-12 items-center gap-2 rounded-full border border-ink-900/12 bg-white px-5 py-3 text-sm font-semibold text-ink-900 transition-colors hover:border-brand-400 hover:text-brand-700"
              >
                <Mail className="size-4.5 text-brand-600" aria-hidden />
                {dict.product.email}
              </a>
              <WishlistButton
                productId={product.id}
                productName={product.name}
                labels={{
                  add: fmt(dict.product.wishlistAdd, { name: product.name }),
                  remove: fmt(dict.product.wishlistRemove, { name: product.name }),
                }}
                className="size-12"
              />
            </div>
          </div>

          <p className="mt-8 rounded-xl bg-mint px-4 py-3 text-[13px] leading-relaxed text-ink-500">
            {dict.product.infoNote}
          </p>
        </div>
      </div>

      {related.length > 0 && (
        <section aria-label={dict.product.related} className="mt-16">
          <h2 className="mb-6 text-2xl font-extrabold text-ink-900">
            {dict.product.related}
          </h2>
          <ProductCarousel label={dict.product.related}>
            {related.map((p) => (
              <ProductCard key={p.id} product={p} dict={dict} />
            ))}
          </ProductCarousel>
        </section>
      )}
    </div>
  );
}
