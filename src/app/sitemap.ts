import type { MetadataRoute } from "next";
import { getAllCategories, getProducts } from "@/lib/catalog";
import { offersAvailable } from "@/lib/offers";
import { SITE } from "@/lib/site";

/** One entry per Albanian URL, with the English /en twin as an alternate. */
function entry(
  path: string,
  changeFrequency: "daily" | "weekly" | "monthly",
  priority: number,
  lastModified?: Date
): MetadataRoute.Sitemap[number] {
  const base = SITE.domain;
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
  const staticPages: MetadataRoute.Sitemap = [
    entry("", "weekly", 1),
    entry("/produktet", "daily", 0.9),
    entry("/kategorite", "weekly", 0.8),
    entry("/markat", "monthly", 0.7),
    entry("/rreth-nesh", "monthly", 0.6),
    entry("/kontakti", "monthly", 0.6),
  ];

  // Listed only while it has something on it — see offersAvailable().
  if (await offersAvailable()) {
    staticPages.push(entry("/oferta", "weekly", 0.7));
  }

  const categories: MetadataRoute.Sitemap = (await getAllCategories())
    .filter((c) => c.count > 0)
    .map((c) => entry(`/kategorite/${c.slug}`, "weekly", 0.7));

  const { items } = await getProducts({ perPage: 3000 });
  const products: MetadataRoute.Sitemap = items.map((p) =>
    // updated_at is the row's own timestamp, so a crawler is told to come back
    // for the products an editor actually touched instead of for all 2 049.
    entry(`/produktet/${p.slug}`, "weekly", 0.5, p.updatedAt ?? undefined)
  );

  return [...staticPages, ...categories, ...products];
}
