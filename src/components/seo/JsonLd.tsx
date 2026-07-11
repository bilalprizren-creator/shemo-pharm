import { SITE } from "@/lib/site";

/** Serializes structured data safely for embedding in a script tag. */
function Script({ data }: { data: Record<string, unknown> }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(data).replace(/</g, "\\u003c"),
      }}
    />
  );
}

/** Organization data — only verified business facts, no ratings or claims. */
export function OrganizationJsonLd() {
  return (
    <Script
      data={{
        "@context": "https://schema.org",
        "@type": "Organization",
        name: SITE.name,
        url: SITE.domain,
        logo: `${SITE.domain}/logo.svg`,
        description: SITE.description,
        telephone: "+38349600934",
        email: SITE.emails[0],
        address: {
          "@type": "PostalAddress",
          streetAddress: SITE.address.street,
          addressLocality: SITE.address.city,
          postalCode: SITE.address.postalCode,
          addressCountry: "XK",
        },
        sameAs: [SITE.social.facebook],
      }}
    />
  );
}

export function BreadcrumbJsonLd({
  items,
}: {
  items: { name: string; url?: string }[];
}) {
  return (
    <Script
      data={{
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        itemListElement: items.map((item, i) => ({
          "@type": "ListItem",
          position: i + 1,
          name: item.name,
          ...(item.url ? { item: `${SITE.domain}${item.url}` } : {}),
        })),
      }}
    />
  );
}

/** Product data without price or availability — B2B prices stay private. */
export function ProductJsonLd({
  name,
  sku,
  image,
  category,
  slug,
}: {
  name: string;
  sku: string;
  image: string | null;
  category: string | null;
  slug: string;
}) {
  return (
    <Script
      data={{
        "@context": "https://schema.org",
        "@type": "Product",
        name,
        ...(sku ? { sku } : {}),
        ...(image ? { image } : {}),
        ...(category ? { category } : {}),
        url: `${SITE.domain}/produktet/${slug}`,
        brand: { "@type": "Organization", name: SITE.name },
      }}
    />
  );
}
