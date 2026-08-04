import type { NextConfig } from "next";
import { REMOTE_IMAGE_PATTERNS } from "./src/lib/images";

const nextConfig: NextConfig = {
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
