import { headers } from "next/headers";
import { SITE } from "@/lib/site";

/**
 * Serializes structured data safely for embedding in a script tag.
 *
 * The nonce is read here rather than passed in by each caller: a JSON-LD block
 * added later would otherwise be one forgotten prop away from being reported as
 * a policy violation. Next stamps its own scripts automatically, but not these.
 * Absent header (no proxy in the request path) means no attribute, which is
 * exactly right — a stale nonce would be worse than none.
 */
async function Script({ data }: { data: Record<string, unknown> }) {
  const nonce = (await headers()).get("x-nonce") ?? undefined;
  return (
    <script
      type="application/ld+json"
      nonce={nonce}
      // Browsers blank the nonce attribute once the document is parsed, so that
      // a CSS attribute selector cannot read it back out. React compares
      // attributes during hydration, sees "" against the value the server sent,
      // and reports a mismatch for a tag that is in fact correct. Suppressing it
      // here is the narrow fix; the element is static and never re-renders.
      suppressHydrationWarning
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(data).replace(/</g, "\\u003c"),
      }}
    />
  );
}

/**
 * Organization data — only verified business facts, no ratings or claims.
 *
 * Typed as both Organization and MedicalBusiness: the second is what makes a
 * search engine treat the address, phone and hours as a real place of business
 * rather than a page footer. Opening hours are transcribed from SITE.hours
 * ("E hënë – E premte, 09:00 – 18:00") — if that string changes, this has to
 * change with it, which is why the days are spelled out here instead of parsed.
 */
export function OrganizationJsonLd() {
  return (
    <Script
      data={{
        "@context": "https://schema.org",
        "@type": ["Organization", "MedicalBusiness"],
        name: SITE.name,
        legalName: SITE.legalName,
        url: SITE.domain,
        logo: `${SITE.domain}/logo.svg`,
        image: `${SITE.domain}/opengraph-image`,
        description: SITE.description,
        telephone: SITE.phones.map((p) => p.href.replace("tel:", "")),
        email: SITE.emails[0],
        address: {
          "@type": "PostalAddress",
          streetAddress: SITE.address.street,
          addressLocality: SITE.address.city,
          postalCode: SITE.address.postalCode,
          addressCountry: "XK",
        },
        areaServed: { "@type": "Country", name: "Kosovë" },
        openingHoursSpecification: [
          {
            "@type": "OpeningHoursSpecification",
            dayOfWeek: [
              "Monday",
              "Tuesday",
              "Wednesday",
              "Thursday",
              "Friday",
            ],
            opens: "09:00",
            closes: "18:00",
          },
        ],
        // Only profiles that were actually verified; youtube is still null.
        sameAs: [SITE.social.facebook, SITE.social.instagram, SITE.social.youtube].filter(
          (url): url is string => Boolean(url)
        ),
      }}
    />
  );
}

/**
 * The site itself, plus the catalog search box.
 *
 * `SearchAction` is what lets a search engine offer a search field for this
 * site directly in its results. It points at the same URL the header search
 * form submits to, so there is one search, not a second one built for robots.
 */
export function WebSiteJsonLd() {
  return (
    <Script
      data={{
        "@context": "https://schema.org",
        "@type": "WebSite",
        name: SITE.name,
        url: SITE.domain,
        inLanguage: ["sq", "en"],
        potentialAction: {
          "@type": "SearchAction",
          target: {
            "@type": "EntryPoint",
            urlTemplate: `${SITE.domain}/produktet?kerko={search_term_string}`,
          },
          "query-input": "required name=search_term_string",
        },
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
