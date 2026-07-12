import type { MetadataRoute } from "next";
import { getAllCategories, getProducts } from "@/lib/catalog";
import { SITE } from "@/lib/site";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = SITE.domain;

  const staticPages: MetadataRoute.Sitemap = [
    { url: base, changeFrequency: "weekly", priority: 1 },
    { url: `${base}/produktet`, changeFrequency: "daily", priority: 0.9 },
    { url: `${base}/kategorite`, changeFrequency: "weekly", priority: 0.8 },
    { url: `${base}/markat`, changeFrequency: "monthly", priority: 0.7 },
    { url: `${base}/oferta`, changeFrequency: "weekly", priority: 0.7 },
    { url: `${base}/rreth-nesh`, changeFrequency: "monthly", priority: 0.6 },
    { url: `${base}/kontakti`, changeFrequency: "monthly", priority: 0.6 },
  ];

  const categories: MetadataRoute.Sitemap = getAllCategories()
    .filter((c) => c.count > 0)
    .map((c) => ({
      url: `${base}/kategorite/${c.slug}`,
      changeFrequency: "weekly" as const,
      priority: 0.7,
    }));

  const { items } = getProducts({ perPage: 3000 });
  const products: MetadataRoute.Sitemap = items.map((p) => ({
    url: `${base}/produktet/${p.slug}`,
    changeFrequency: "weekly" as const,
    priority: 0.5,
  }));

  return [...staticPages, ...categories, ...products];
}
