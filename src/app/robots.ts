import type { MetadataRoute } from "next";
import { SITE_ORIGINS, modeFromHost } from "@/lib/site-mode";

/** Account, basket and wishlist pages carry no search value in either locale. */
const PRIVATE_PATHS = [
  "/llogaria",
  "/kycu",
  "/regjistrohu",
  "/lista-e-deshirave",
  "/shporta",
  "/verifikimi",
];

/**
 * The catalogue domain's own private paths.
 *
 * Only what SHARED_PATHS actually serves there — the shop's basket and wishlist
 * do not exist on the catalogue site, and disallowing a path that 404s tells a
 * crawler nothing while implying the site is bigger than it is.
 */
const KATALOG_PRIVATE_PATHS = [
  "/llogaria",
  "/kycu",
  "/regjistrohu",
  "/verifikimi",
];

/**
 * Two sites, two robots.txt, one file — the same split sitemap.ts makes.
 *
 * The proxy's matcher skips /robots.txt, so `x-site` is not set and the host
 * has to be read directly (modeFromHost). Without it the catalogue domain hands
 * crawlers the shop's sitemap URL, which is a list of pages that domain does
 * not serve.
 */
export default async function robots(): Promise<MetadataRoute.Robots> {
  const mode = await modeFromHost();
  const base = SITE_ORIGINS[mode];
  const private_ = mode === "katalog" ? KATALOG_PRIVATE_PATHS : PRIVATE_PATHS;

  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/api/",
        "/admin",
        ...private_,
        ...private_.map((p) => `/en${p}`),
      ],
    },
    sitemap: `${base}/sitemap.xml`,
  };
}
