import type { NextConfig } from "next";
import { REMOTE_IMAGE_PATTERNS } from "./src/lib/images";

/**
 * Category slugs the taxonomy migration retired, and where each one went.
 *
 * The old tree came out of WooCommerce and mixed brands with product types; the
 * reclassification renamed eight categories and merged eleven into another one.
 * Both operations delete a URL that is indexed and linked, and /kategorite/[slug]
 * answers 404 for anything it cannot resolve, so every retired slug is mapped
 * here rather than left to rot.
 *
 * `qorape` is the one entry that does not point at its own renamed self:
 * "Çorape" survives as a category but the audit emptied it — the orthopedic
 * socks turned out to be compression stockings — and an empty listing is a
 * worse answer than its parent, which holds the whole leg-and-foot range.
 */
const RETIRED_CATEGORY_SLUGS: Record<string, string> = {
  // renamed
  "suplements-effervescent": "suplemente",
  capsula: "kapsula",
  krema: "kujdesi-i-trupit",
  shampo: "kujdesi-i-flokeve",
  qorape: "kembe",
  hollaopke: "corape-kompresioni",
  pampers: "pelena-per-te-rritur",
  orbit: "embelsira",
  // merged into another category
  "kozmetike-swiss-energy": "swiss-energy",
  "krem-swiss-energy": "swiss-energy",
  "kozmetike-labella": "labella",
  labelle: "labella",
  krem: "krauterhof",
  "balsam-krauterhof": "krauterhof",
  serum: "krauterhof",
  "shampo-krauterhof": "krauterhof",
  "te-ndryshme-atc-natyral": "atc-natyral",
  "dore-dore": "dore",
  "te-ndryshme-prezervativ": "prezervativ",
};

const nextConfig: NextConfig = {
  // Runs before src/proxy.ts (headers -> redirects -> proxy), so the sources
  // are the paths a browser actually asks for: Albanian bare, English prefixed.
  async redirects() {
    return Object.entries(RETIRED_CATEGORY_SLUGS).flatMap(([from, to]) =>
      ["", "/en"].map((prefix) => ({
        source: `${prefix}/kategorite/${from}`,
        destination: `${prefix}/kategorite/${to}`,
        permanent: true,
      }))
    );
  },

  images: {
    // Single source of truth — the admin form and the catalog layer validate
    // against the same list, so an unconfigured host can never reach next/image.
    remotePatterns: [...REMOTE_IMAGE_PATTERNS],

    // Every distinct image+width+format costs one transformation against the
    // plan's quota, so the defaults are trimmed to the widths this site can
    // actually use. Product photos are 1000x1000 files, so the 1200/2048/3840
    // variants Next generates for `sizes` with vw units were pure waste — they
    // only upscale. 1920 stays for the full-width photos in public/photos/
    // (the largest is 1448px wide).
    deviceSizes: [640, 750, 828, 1080, 1920],
    // Drops 32 (nothing is that small) — the rest cover the 44px search rows,
    // 48px menu circles, 72px gallery thumbs and 80px cart lines.
    imageSizes: [48, 64, 96, 128, 256, 384],

    // The default 4h means a popular product image is re-transformed six times
    // a day. Filenames under public/products/ are stable and their contents
    // never change in place — a new photo means a new file — so a variant can
    // be cached for a month and transformed exactly once.
    minimumCacheTTL: 2678400,

    // Deliberately WebP only. Adding AVIF would double the transformation count
    // for a modest extra saving on files that are already ~30 KB.
    formats: ["image/webp"],
  },
};

export default nextConfig;
