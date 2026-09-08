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
  // Nothing gains from telling the world which framework serves the page.
  poweredByHeader: false,

  /**
   * Baseline security headers. Vercel already sends HSTS; these are the ones
   * the platform leaves to the application.
   *
   * The Content-Security-Policy is NOT here: it carries a nonce that has to be
   * new on every request, which a static header table cannot produce. It is
   * built in src/lib/csp.ts and sent from src/proxy.ts, currently in
   * report-only mode. `frame-ancestors 'self'` there agrees with the
   * X-Frame-Options below rather than contradicting it.
   */
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          // The site is never meant to be framed; the admin panel least of all.
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=(), browsing-topics=()",
          },
        ],
      },
      {
        /**
         * The proxy's matcher excludes /api, so API responses get no policy from
         * there — and it should stay excluded: a path the proxy matches has its
         * whole request body cloned and buffered so it can be read twice, which
         * would double the upload route's peak memory for no benefit.
         *
         * A static policy costs nothing here and cannot interact with the body.
         * A JSON response is not a document, so this is belt-and-braces against
         * one being coaxed into rendering as one — nothing may load, nothing may
         * frame it, and the sandbox denies it an origin if it ever does.
         */
        source: "/api/:path*",
        headers: [
          {
            key: "Content-Security-Policy",
            value: "default-src 'none'; frame-ancestors 'none'; sandbox",
          },
        ],
      },
      {
        /**
         * The product photographs, which Vercel otherwise serves with
         * `max-age=0, must-revalidate` — one conditional request per file, per
         * visit. On a listing page that is twenty-four of them and nobody
         * notices. On the print sheet it is 1 713, every time somebody reopens
         * it, before a single page can begin to lay out.
         *
         * Not `immutable`, because these filenames are not content-hashed:
         * scripts/cutout-images.mjs rewrites a photograph under the name it
         * already had. A day of certainty, then a month of serving the old copy
         * while the new one arrives, is the trade that fits that.
         */
        source: "/products/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=86400, stale-while-revalidate=2592000",
          },
        ],
      },
      {
        /**
         * The generated catalogue PDFs. `immutable` is safe here and nowhere
         * else under public/, because scripts/build-catalog-pdf.mjs puts the
         * month it ran in the filename — a new run is a new URL, and no file is
         * ever rewritten in place.
         *
         * They live under /pdf/ rather than /katalog/ deliberately: /katalog is
         * a route prefix, and a rule matching it would pin the contents page
         * and all 61 section pages in the visitor's cache for a year.
         */
        source: "/pdf/:path*",
        headers: [
          { key: "Cache-Control", value: "public, max-age=31536000, immutable" },
        ],
      },
    ];
  },

  // Runs before src/proxy.ts (headers -> redirects -> proxy), so the sources
  // are the paths a browser actually asks for: Albanian bare, English prefixed.
  async redirects() {
    return [
      ...Object.entries(RETIRED_CATEGORY_SLUGS).flatMap(([from, to]) =>
        ["", "/en"].map((prefix) => ({
          source: `${prefix}/kategorite/${from}`,
          destination: `${prefix}/kategorite/${to}`,
          permanent: true,
        }))
      ),
      // The two URLs the old hand-written shemo-katalog.com had. They are the
      // only ones it exposed — the whole range lived at / and there was exactly
      // one link on the page — so these two cover every bookmark and every
      // printed reference to it. Harmless before the domain moves; in place the
      // moment it does.
      { source: "/index.php", destination: "/katalog", permanent: true },
      { source: "/login.php", destination: "/kycu", permanent: true },
    ];
  },

  images: {
    /*
     * The optimizer is off, and every setting below it is dormant until it
     * comes back.
     *
     * Vercel's Hobby plan allows 5 000 image transformations, where a
     * transformation is one image at one width in one format. This site has
     * 2 049 products and asks for several widths of each, so the ceiling is not
     * something it brushes against — it does not fit underneath it at all. The
     * counter passed 5 000, `/_next/image` began answering 402
     * (OPTIMIZED_IMAGE_REQUEST_PAYMENT_REQUIRED), and the shop lost its
     * photographs one by one as the cached variants expired. Products whose
     * variants were still cached kept theirs, which is why the grid looked
     * half-broken rather than broken.
     *
     * `unoptimized` makes next/image render a plain <img> at the file itself,
     * served from public/ by the CDN. It costs bytes: the sources are 1000x1000
     * and a card shows 288, so roughly 37 KB travels where 12 KB would do. That
     * is the right trade against no photographs at all, and small in absolute
     * terms — none of the 4 574 files exceeds 200 KB, and they are already WebP
     * at q82 out of scripts/cutout-images.mjs, so the optimizer was mostly
     * re-encoding work that was already done.
     *
     * To undo: delete this line. Everything under it is still correct and takes
     * effect again immediately — but only do it on a plan whose transformation
     * budget fits the catalogue, or the 402s come back. The durable fix on
     * Hobby is to pre-generate 384px variants into public/ and keep this off.
     */
    unoptimized: true,

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

    // Required since Next 16, where the default narrowed to [75]. 85 is for the
    // two large product surfaces only — the card and the detail gallery. The
    // source files are already WebP q82 (scripts/cutout-images.mjs), so 75 is a
    // second lossy pass, and it lands on the small print of a carton. The
    // 44-80px thumbnails stay on 75: invisible there, and every extra quality
    // is another set of transformations against the plan's quota.
    qualities: [75, 85],
  },
};

export default nextConfig;
