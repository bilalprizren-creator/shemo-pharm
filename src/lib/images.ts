/**
 * Where product photography may come from.
 *
 * next/image refuses (and throws for) any remote host that is not configured,
 * which would take down the public product page. So the same allow list feeds
 * three places: next.config.ts (what the optimizer accepts), the admin form
 * (what an editor may paste) and the catalog layer (what reaches a component).
 *
 * Product photography is moving from the old WordPress to Vercel Blob. Both
 * hosts are listed during the move: the Blob one has to be accepted BEFORE the
 * new URLs reach the database, or every product would fall back to the
 * placeholder icon, and the WordPress one stays until the migration is verified
 * so the old URLs remain a way back.
 */
export const REMOTE_IMAGE_PATTERNS = [
  {
    protocol: "https",
    hostname: "*.public.blob.vercel-storage.com",
    pathname: "/products/**",
  },
  {
    protocol: "https",
    hostname: "shemopharm.com",
    pathname: "/wp-content/uploads/**",
  },
] as const;

/** Local files under public/ are always fine (e.g. /products/foto.png). */
export function isAllowedImageSrc(src: string): boolean {
  const value = src.trim();
  if (!value) return false;
  if (value.startsWith("/")) return !value.startsWith("//");

  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return false;
  }
  return REMOTE_IMAGE_PATTERNS.some(
    (p) =>
      url.protocol === `${p.protocol}:` &&
      hostMatches(url.hostname, p.hostname) &&
      url.pathname.startsWith(p.pathname.replace(/\*+$/, ""))
  );
}

/**
 * Exact match, or a leading `*.` standing for exactly one subdomain label —
 * the same meaning next/image gives it. The Blob store's host carries a
 * generated id (`<storeid>.public.blob.vercel-storage.com`), so pinning the
 * literal name would break the day the store is recreated.
 */
function hostMatches(hostname: string, pattern: string): boolean {
  if (!pattern.startsWith("*.")) return hostname === pattern;
  const suffix = pattern.slice(1); // ".public.blob.vercel-storage.com"
  if (!hostname.endsWith(suffix)) return false;
  const label = hostname.slice(0, -suffix.length);
  return label.length > 0 && !label.includes(".");
}
