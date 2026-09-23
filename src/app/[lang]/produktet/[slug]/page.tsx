import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { Clock, Lock, LogIn, Mail, MessageCircle, Phone } from "lucide-react";
import { canSeePrices, getSession } from "@/lib/auth";
import {
  brandCategoryOf,
  catalogSectionSlug,
  categoryDisplayName,
  getAllCategories,
  getCatalogSections,
  getProductBySlug,
  getRelatedProducts,
  primaryCategory,
  primaryCategoryOf,
  productDisplayName,
  toCardProducts,
} from "@/lib/catalog";
import { formatPrice } from "@/lib/format";
import { packSizeOf } from "@/lib/pack-size";
import { photoFit } from "@/lib/photo-fit";
import { productActionFor } from "@/lib/product-action";
import { SITE } from "@/lib/site";
import { isLang, langHref, languageAlternates, fmt, type Lang } from "@/lib/i18n";
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
  const product = await getProductBySlug(slug);
  if (!product) return {};
  const cat = await primaryCategory(product);
  // The same name the cards show: the catalog code belongs in the code field,
  // not in the page title.
  const title = productDisplayName(product);
  const description = `${title}${cat ? ` — ${categoryDisplayName(cat)}` : ""}. ${dict.site.description}`;
  const canonical = langHref(dict.lang, `/produktet/${slug}`);
  const photo = product.imageOverride ?? product.images[0];

  return {
    title,
    description,
    alternates: {
      canonical,
      languages: languageAlternates(`/produktet/${slug}`),
    },
    // Declaring `openGraph` replaces the layout's block wholesale rather than
    // merging into it, so everything it set has to be repeated here — this was
    // the one route that set only `images` and silently lost type, locale and
    // siteName. listingMetadata() in CatalogView is the same shape.
    //
    // The photo is square and its dimensions are declared as such: WhatsApp and
    // Viber are where these links are actually shared, and an undeclared image
    // is assumed wide and centre-cropped, which cuts the top and bottom off a
    // carton. Products without a photo fall back to the generated site card.
    openGraph: {
      type: "website",
      locale: dict.lang === "en" ? "en" : "sq",
      siteName: SITE.name,
      title,
      description,
      url: canonical,
      images: photo
        ? [{ url: photo, width: 1000, height: 1000, alt: title }]
        : [{ url: "/opengraph-image", width: 1200, height: 630 }],
    },
  };
}

/**
 * Worth printing as a description: some of the few descriptions the import
 * carried are not prose at all (one product's is the single character "4").
 * Size and variant lists ("S, M, L, XL") stay — they are what that product's
 * page most needs to say.
 */
const isReadable = (text: string) => /\p{L}{3}/u.test(text);

export default async function ProductPage({ params }: Props) {
  const { lang, slug } = await params;
  const dict = getDictionary(isLang(lang) ? (lang as Lang) : "sq");
  const product = await getProductBySlug(slug);
  if (!product) notFound();

  const session = await getSession();
  const showPrices = canSeePrices(session);
  // One action leads, chosen by who is looking — see productActionFor.
  const action = productActionFor(session);

  const title = productDisplayName(product);
  const all = await getAllCategories();
  // The same category the card, the search suggestion and the JSON-LD name.
  const mainCat = primaryCategoryOf(product, all);
  // A different axis of the same table: what the product *is* versus who makes
  // it. Only recorded where the maker's mark is on the pack (audit/RULES.md),
  // which is what makes it safe to print as a fact.
  const brandCat = brandCategoryOf(product, all);
  // Read off the name, never guessed: null unless the name states exactly one
  // size (src/lib/pack-size.ts). An admin's display name is asked first, since
  // it is the name the page shows.
  const packSize = packSizeOf(title) ?? packSizeOf(product.name);
  // Where the printed catalogue carries it — the page a partner holding the
  // paper edition turns to. Only when the catalogue actually prints it.
  const section =
    product.catalogHidden || product.catalogSectionId === null
      ? undefined
      : (await getCatalogSections()).find((s) => s.id === product.catalogSectionId);
  const description = [
    product.shortDescription,
    product.description !== product.shortDescription ? product.description : "",
  ]
    .map((text) => text.trim())
    .filter(isReadable);

  // The admin's photo override leads, as it does on every card; without one
  // the imported photos. Each with the size factor the cards draw it at.
  const gallery = product.imageOverride ? [product.imageOverride] : product.images;
  const fits = gallery.map(photoFit);

  const crumbs: Crumb[] = [
    { label: dict.catalog.title, href: "/produktet" },
    ...(mainCat
      ? [{ label: categoryDisplayName(mainCat), href: `/kategorite/${mainCat.slug}` }]
      : []),
    { label: title },
  ];

  const related = await toCardProducts(
    await getRelatedProducts(product, 8),
    showPrices
  );

  const whatsappText = encodeURIComponent(
    `${fmt(dict.product.whatsappInterest, { name: title })}${
      product.sku ? ` (${dict.common.code}: ${product.sku})` : ""
    }`
  );
  const mailSubject = encodeURIComponent(
    fmt(dict.product.mailSubject, { name: title })
  );
  const productPath = langHref(dict.lang, `/produktet/${product.slug}`);

  const basket = (
    <AddToCartWithQty
      productId={product.id}
      productName={title}
      emphasis={action === "login" ? "secondary" : "primary"}
      labels={{
        add: dict.product.addToCart,
        added: dict.product.addedToCart,
        addAria: fmt(dict.product.addToCartAria, { name: title }),
        increase: dict.product.increaseQty,
        decrease: dict.product.decreaseQty,
        qty: dict.product.qtyLabel,
        qtyInput: dict.product.qtyInput,
      }}
    />
  );

  // Adding an out-of-stock product is allowed and always was — this is a
  // wholesale order request, not a checkout, and a pharmacy ordering ahead of a
  // delivery is the normal case. Said beside the basket, so the button does
  // not look like it promises stock.
  const stockNote = !product.inStock && (
    <p className="mb-3 rounded-lg bg-amber-50 px-3 py-2 text-[13px] leading-relaxed text-amber-900">
      {dict.product.outOfStockOrderNote}
    </p>
  );

  const facts: { label: string; value: ReactNode }[] = [
    ...(brandCat
      ? [
          {
            label: dict.product.brand,
            value: (
              <Link
                href={langHref(dict.lang, `/kategorite/${brandCat.slug}`)}
                className="text-brand-700 underline decoration-brand-200 underline-offset-2 hover:text-brand-800"
              >
                {categoryDisplayName(brandCat)}
              </Link>
            ),
          },
        ]
      : []),
    ...(packSize ? [{ label: dict.product.packSize, value: packSize }] : []),
    ...(mainCat
      ? [
          {
            label: dict.product.category,
            value: (
              <Link
                href={langHref(dict.lang, `/kategorite/${mainCat.slug}`)}
                className="text-brand-700 underline decoration-brand-200 underline-offset-2 hover:text-brand-800"
              >
                {categoryDisplayName(mainCat)}
              </Link>
            ),
          },
        ]
      : []),
    ...(section
      ? [
          {
            label: dict.product.printedCatalog,
            value: (
              <Link
                href={langHref(dict.lang, `/katalog/${catalogSectionSlug(section)}`)}
                className="text-brand-700 underline decoration-brand-200 underline-offset-2 hover:text-brand-800"
              >
                {fmt(dict.product.printedSection, { no: section.catalogNo, name: section.name })}
              </Link>
            ),
          },
        ]
      : []),
  ];

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 lg:px-6 lg:py-10">
      <ProductJsonLd
        name={title}
        sku={product.sku}
        images={gallery}
        category={mainCat ? categoryDisplayName(mainCat) : null}
        brand={brandCat ? categoryDisplayName(brandCat) : null}
        description={product.shortDescription || product.description}
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
          { name: title },
        ]}
      />
      <Breadcrumbs items={crumbs} dict={dict} />

      {/* Tighter on a phone, where the gallery fills the first screen: the
          action box has to clear the fixed bottom bar (StickyMobileBar)
          without a scroll — measured on a 375×812 screen it sat half under it. */}
      <div className="mt-4 grid gap-5 sm:mt-6 sm:gap-8 lg:grid-cols-2 lg:gap-12">
        <ProductGallery
          images={gallery}
          fits={fits}
          name={title}
          labels={{
            list: dict.product.galleryLabel,
            image: dict.product.galleryImage,
          }}
        />

        <div>
          {brandCat && (
            <p className="text-sm font-semibold text-accent-700">{categoryDisplayName(brandCat)}</p>
          )}
          <h1 className="mt-1 text-2xl font-extrabold leading-tight text-ink-900 sm:text-3xl">
            {title}
          </h1>

          <dl className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-1.5 text-sm text-ink-500">
            {product.sku && (
              <div className="flex gap-1.5">
                <dt>{dict.product.codeLabel}</dt>
                <dd className="font-semibold tabular-nums text-ink-700">{product.sku}</dd>
              </div>
            )}
            <div className="flex items-center gap-1.5">
              <dt className="sr-only">{dict.product.availability}</dt>
              {product.inStock ? (
                <dd className="flex items-center gap-1.5 font-medium text-accent-700">
                  <span className="size-2 rounded-full bg-accent-500" aria-hidden />
                  {dict.product.inStock}
                </dd>
              ) : (
                <dd className="flex items-center gap-1.5 font-medium text-amber-700">
                  <span className="size-2 rounded-full bg-amber-500" aria-hidden />
                  {dict.product.outOfStock}
                </dd>
              )}
            </div>
          </dl>

          {/* The one box that says what to do, and leads with one thing. */}
          <div className="mt-4 rounded-2xl border border-line bg-white p-4 shadow-card sm:mt-6 sm:p-5">
            {action === "order" && (
              <>
                <p className="text-sm text-ink-400">{dict.product.wholesalePrice}</p>
                <p className="mt-1 flex items-baseline gap-2.5">
                  <span className="text-3xl font-extrabold tabular-nums text-ink-900">
                    {formatPrice(product.priceCents)}
                  </span>
                  {product.regularCents > product.priceCents && (
                    <s className="text-base font-medium text-ink-300">
                      {formatPrice(product.regularCents)}
                    </s>
                  )}
                </p>
                <div className="mt-4 border-t border-line pt-4">
                  {stockNote}
                  {basket}
                </div>
              </>
            )}

            {action === "pending" && (
              <>
                <div className="flex items-start gap-3 rounded-xl bg-amber-50 px-4 py-3 text-amber-900">
                  <Clock className="mt-0.5 size-4.5 shrink-0 text-amber-700" aria-hidden />
                  <div className="text-sm leading-relaxed">
                    <p className="font-semibold">{dict.accountPage.pendingTitle}</p>
                    <p className="mt-0.5">{dict.accountPage.pendingText}</p>
                  </div>
                </div>
                <div className="mt-4">
                  {stockNote}
                  {basket}
                  <p className="mt-3 text-[13px] leading-relaxed text-ink-500">
                    {dict.product.requestWithoutPrice}
                  </p>
                </div>
              </>
            )}

            {action === "login" && (
              <>
                <p className="flex items-center gap-2 text-sm font-medium text-ink-700">
                  <Lock className="size-4 shrink-0 text-brand-600" aria-hidden />
                  {dict.product.pricesHidden}
                </p>
                <Link
                  // Back to this product afterwards, now with its price.
                  href={`${langHref(dict.lang, "/kycu")}?kthehu=${encodeURIComponent(productPath)}`}
                  className="mt-3 flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-brand-600 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-brand-700 sm:mt-4"
                >
                  <LogIn className="size-4.5" aria-hidden />
                  {dict.product.loginToSeePrice}
                </Link>
                <p className="mt-2.5 text-center text-sm text-ink-500">
                  {dict.auth.noAccount}{" "}
                  <Link
                    href={langHref(dict.lang, "/regjistrohu")}
                    className="font-semibold text-brand-700 hover:text-brand-800"
                  >
                    {dict.auth.registerButton}
                  </Link>
                </p>
                <div className="mt-5 border-t border-line pt-4">
                  {stockNote}
                  {basket}
                  <p className="mt-3 text-[13px] leading-relaxed text-ink-500">
                    {dict.product.requestWithoutPrice}
                  </p>
                </div>
              </>
            )}
          </div>

          {facts.length > 0 && (
            <section className="mt-6" aria-labelledby="product-details">
              <h2
                id="product-details"
                className="text-sm font-bold uppercase tracking-wide text-ink-900"
              >
                {dict.product.detailsHeading}
              </h2>
              <dl className="mt-3 divide-y divide-line rounded-2xl border border-line bg-white text-sm">
                {facts.map((fact) => (
                  <div key={fact.label} className="grid grid-cols-[8.5rem_1fr] gap-4 px-4 py-2.5">
                    <dt className="text-ink-400">{fact.label}</dt>
                    <dd className="min-w-0 font-medium text-ink-900">{fact.value}</dd>
                  </div>
                ))}
              </dl>
            </section>
          )}

          {description.length > 0 && (
            <section className="mt-6" aria-labelledby="product-description">
              <h2
                id="product-description"
                className="text-sm font-bold uppercase tracking-wide text-ink-900"
              >
                {dict.product.descriptionHeading}
              </h2>
              <div className="mt-2 space-y-3 text-[15px] leading-relaxed text-ink-500">
                {description.map((text) => (
                  <p key={text} className="whitespace-pre-line">
                    {text}
                  </p>
                ))}
              </div>
            </section>
          )}

          {/* Secondary on purpose, and the same weight for all three: the
              basket is how an order is placed here, and these are for
              questions — or for a partner who would rather talk it through. */}
          <section className="mt-8" aria-labelledby="product-contact">
            <h2
              id="product-contact"
              className="text-sm font-bold uppercase tracking-wide text-ink-900"
            >
              {dict.product.contactHeading}
            </h2>
            <p className="mt-1 text-[13px] leading-relaxed text-ink-500">{dict.product.infoNote}</p>
            <div className="mt-3 flex flex-wrap gap-2.5">
              <a
                href={`${SITE.whatsapp}?text=${whatsappText}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex min-h-11 items-center gap-2 rounded-full border border-ink-900/12 bg-white px-4 py-2.5 text-sm font-semibold text-ink-900 transition-colors hover:border-accent-400 hover:text-accent-800"
              >
                <MessageCircle className="size-4.5 text-accent-600" aria-hidden />
                {dict.product.orderWhatsapp}
              </a>
              <a
                href={SITE.phones[0].href}
                className="inline-flex min-h-11 items-center gap-2 rounded-full border border-ink-900/12 bg-white px-4 py-2.5 text-sm font-semibold text-ink-900 transition-colors hover:border-brand-400 hover:text-brand-700"
              >
                <Phone className="size-4.5 text-brand-600" aria-hidden />
                {dict.product.callUs}
              </a>
              <a
                href={`mailto:${SITE.emails[0]}?subject=${mailSubject}`}
                className="inline-flex min-h-11 items-center gap-2 rounded-full border border-ink-900/12 bg-white px-4 py-2.5 text-sm font-semibold text-ink-900 transition-colors hover:border-brand-400 hover:text-brand-700"
              >
                <Mail className="size-4.5 text-brand-600" aria-hidden />
                {dict.product.email}
              </a>
              <WishlistButton
                productId={product.id}
                productName={title}
                labels={{
                  add: fmt(dict.product.wishlistAdd, { name: title }),
                  remove: fmt(dict.product.wishlistRemove, { name: title }),
                }}
                className="size-11"
              />
            </div>
          </section>
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
