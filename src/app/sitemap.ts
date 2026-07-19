import type { MetadataRoute } from "next";
import { getAllCategories, getProducts } from "@/lib/catalog";
import { SITE } from "@/lib/site";

/** One entry per Albanian URL, with the English /en twin as an alternate. */
function entry(
  path: string,
  changeFrequency: "daily" | "weekly" | "monthly",
  priority: number
): MetadataRoute.Sitemap[number] {
  const base = SITE.domain;
  return {
    url: `${base}${path}`,
    changeFrequency,
    priority,
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
    entry("/oferta", "weekly", 0.7),
    entry("/rreth-nesh", "monthly", 0.6),
    entry("/kontakti", "monthly", 0.6),
  ];

  const categories: MetadataRoute.Sitemap = (await getAllCategories())
    .filter((c) => c.count > 0)
    .map((c) => entry(`/kategorite/${c.slug}`, "weekly", 0.7));

  const { items } = await getProducts({ perPage: 3000 });
  const products: MetadataRoute.Sitemap = items.map((p) =>
    entry(`/produktet/${p.slug}`, "weekly", 0.5)
  );

  return [...staticPages, ...categories, ...products];
}
