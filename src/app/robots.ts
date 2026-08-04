import type { MetadataRoute } from "next";
import { SITE } from "@/lib/site";

/** Account, basket and wishlist pages carry no search value in either locale. */
const PRIVATE_PATHS = [
  "/llogaria",
  "/kycu",
  "/regjistrohu",
  "/lista-e-deshirave",
  "/shporta",
  "/verifikimi",
];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/api/",
        "/admin",
        ...PRIVATE_PATHS,
        ...PRIVATE_PATHS.map((p) => `/en${p}`),
      ],
    },
    sitemap: `${SITE.domain}/sitemap.xml`,
  };
}
