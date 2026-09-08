import type { MetadataRoute } from "next";
import {
  catalogSectionSlug,
  getAllCategories,
  getAllProducts,
  getAllProductsInCatalogOrder,
  getCatalogSections,
} from "@/lib/catalog";
import { offersAvailable } from "@/lib/offers";
import { SITE_ORIGINS, modeFromHost } from "@/lib/site-mode";
import { PER_PAGE } from "@/katalog/AllProducts";

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
  const mode = await modeFromHost();
  const base = SITE_ORIGINS[mode];
  const at = (
    path: string,
    freq: "daily" | "weekly" | "monthly",
    priority: number,
    lastModified?: Date
  ) => entry(base, path, freq, priority, lastModified);

  /**
   * The catalogue's own pages, under whichever prefix serves them.
   *
   * The contents page, every printed section, and the run through everything
   * page by page — each of those pages carries products no section repeats, the
   * 311 that were never printed among them. Product cards there are not links,
   * so there are no product URLs to list, and the print sheets and the search
   * results are noindex by their own choice.
   *
   * Written once and used by both branches, because it was not. The shop's
   * branch listed exactly two catalogue URLs and the other 60-odd lived only in
   * the branch for shemo-katalog.com — a domain that still points elsewhere and
   * is not being moved. So the section pages, which are the ones a partner
   * actually searches for by manufacturer, were in no sitemap that any crawler
   * ever fetched.
   */
  const catalogueEntries = async (
    prefix: "" | "/katalog"
  ): Promise<MetadataRoute.Sitemap> => {
    const sections = await getCatalogSections();
    const all = await getAllProductsInCatalogOrder();
    const pages = Math.max(1, Math.ceil(all.length / PER_PAGE));
    return [
      at(prefix === "" ? "" : prefix, "weekly", 0.8),
      ...sections.map((s) => at(`${prefix}/${catalogSectionSlug(s)}`, "weekly", 0.8)),
      ...Array.from({ length: pages }, (_, i) =>
        at(
          i === 0 ? `${prefix}/te-gjitha` : `${prefix}/te-gjitha?faqja=${i + 1}`,
          "weekly",
          0.6
        )
      ),
    ];
  };

  if (mode === "katalog") {
    // On its own domain the catalogue *is* the site, so its contents page is
    // the root and outranks everything.
    const [root, ...rest] = await catalogueEntries("");
    return [{ ...root!, priority: 1 }, ...rest];
  }

  const staticPages: MetadataRoute.Sitemap = [
    at("", "weekly", 1),
    at("/produktet", "daily", 0.9),
    ...(await catalogueEntries("/katalog")),
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

  const items = await getAllProducts();
  const products: MetadataRoute.Sitemap = items.map((p) =>
    // updated_at is the row's own timestamp, so a crawler is told to come back
    // for the products an editor actually touched instead of for all 2 049.
    at(`/produktet/${p.slug}`, "weekly", 0.5, p.updatedAt ?? undefined)
  );

  return [...staticPages, ...categories, ...products];
}
