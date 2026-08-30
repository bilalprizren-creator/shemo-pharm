import type { MetadataRoute } from "next";
import { headers } from "next/headers";
import {
  catalogSectionSlug,
  getAllCategories,
  getAllProductsInCatalogOrder,
  getCatalogSections,
  getProducts,
} from "@/lib/catalog";
import { offersAvailable } from "@/lib/offers";
import { SITE_ORIGINS, modeForHost, type SiteMode } from "@/lib/site-mode";
import { PER_PAGE } from "@/katalog/AllProducts";

/**
 * Two sites, two sitemaps, one file.
 *
 * The proxy's matcher skips /sitemap.xml, so the `x-site` header it normally
 * sets is not there — the host has to be read directly. Getting this wrong
 * would hand a crawler on the catalogue domain a list of shop URLs.
 */
async function currentMode(): Promise<SiteMode> {
  const h = await headers();
  return modeForHost(h.get("x-forwarded-host") ?? h.get("host"));
}

/** One entry per Albanian URL, with the English /en twin as an alternate. */
function entry(
  base: string,
  path: string,
  changeFrequency: "daily" | "weekly" | "monthly",
  priority: number,
  lastModified?: Date
): MetadataRoute.Sitemap[number] {
  return {
    url: `${base}${path}`,
    changeFrequency,
    priority,
    ...(lastModified ? { lastModified } : {}),
    alternates: {
      languages: {
        sq: `${base}${path}`,
        en: `${base}/en${path}`,
      },
    },
  };
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const mode = await currentMode();
  const base = SITE_ORIGINS[mode];
  const at = (
    path: string,
    freq: "daily" | "weekly" | "monthly",
    priority: number,
    lastModified?: Date
  ) => entry(base, path, freq, priority, lastModified);

  if (mode === "katalog") {
    // The catalogue is the contents page and its sections, and nothing else.
    // Its product cards are not links, so there are no product URLs to list;
    // the print sheets and the search results are noindex by their own choice.
    const sections = await getCatalogSections();
    const all = await getAllProductsInCatalogOrder();
    const pages = Math.max(1, Math.ceil(all.length / PER_PAGE));
    return [
      at("", "weekly", 1),
      ...sections.map((s) => at(`/${catalogSectionSlug(s)}`, "weekly", 0.8)),
      // The run through every product, page by page. Each page carries products
      // no section page repeats — the 311 that were never printed among them.
      ...Array.from({ length: pages }, (_, i) =>
        at(i === 0 ? "/te-gjitha" : `/te-gjitha?faqja=${i + 1}`, "weekly", 0.6)
      ),
    ];
  }

  const staticPages: MetadataRoute.Sitemap = [
    at("", "weekly", 1),
    at("/produktet", "daily", 0.9),
    at("/katalog", "weekly", 0.8),
    at("/katalog/te-gjitha", "weekly", 0.6),
    at("/kategorite", "weekly", 0.8),
    at("/markat", "monthly", 0.7),
    at("/rreth-nesh", "monthly", 0.6),
    at("/kontakti", "monthly", 0.6),
    // Indexable on purpose: a privacy policy nobody can find is not a policy.
    at("/privatesia", "monthly", 0.3),
    at("/kushtet", "monthly", 0.3),
  ];

  // Listed only while it has something on it — see offersAvailable().
  if (await offersAvailable()) {
    staticPages.push(at("/oferta", "weekly", 0.7));
  }

  const categories: MetadataRoute.Sitemap = (await getAllCategories())
    .filter((c) => c.count > 0)
    .map((c) => at(`/kategorite/${c.slug}`, "weekly", 0.7));

  const { items } = await getProducts({ perPage: 3000 });
  const products: MetadataRoute.Sitemap = items.map((p) =>
    // updated_at is the row's own timestamp, so a crawler is told to come back
    // for the products an editor actually touched instead of for all 2 049.
    at(`/produktet/${p.slug}`, "weekly", 0.5, p.updatedAt ?? undefined)
  );

  return [...staticPages, ...categories, ...products];
}
