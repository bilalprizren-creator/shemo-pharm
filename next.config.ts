import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // Product photography stays hosted on the existing site for now.
    // Mirror the uploads folder before decommissioning the old WordPress.
    remotePatterns: [
      {
        protocol: "https",
        hostname: "shemopharm.com",
        pathname: "/wp-content/uploads/**",
      },
    ],
  },
};

export default nextConfig;
