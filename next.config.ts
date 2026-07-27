import type { NextConfig } from "next";
import { REMOTE_IMAGE_PATTERNS } from "./src/lib/images";

const nextConfig: NextConfig = {
  images: {
    // Single source of truth — the admin form and the catalog layer validate
    // against the same list, so an unconfigured host can never reach next/image.
    remotePatterns: [...REMOTE_IMAGE_PATTERNS],
  },
};

export default nextConfig;
