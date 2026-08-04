/**
 * Where product photography may come from.
 *
 * next/image refuses (and throws for) any remote host that is not configured,
 * which would take down the public product page. So the same allow list feeds
 * three places: next.config.ts (what the optimizer accepts), the admin form
 * (what an editor may paste) and the catalog layer (what reaches a component).
 *
 * All 2049 product photos now live in the repo under public/products/, which
 * needs no entry here — local paths are allowed outright below. The old
 * WordPress host stays listed only so an editor can still paste a URL from the
 * old site into the admin form while it is up.
 *
 * Vercel Blob is listed too, but for single photos rather than the bulk of the
 * catalog. The bulk migration blocked the store by spending all 2000 free write
 * operations in one run, which is why the catalog lives in the repo. Adding one
 * product at a time is a different scale entirely — a pharmacy adds tens of
 * products a month, not thousands — so an editor can upload a photo in the
 * Vercel dashboard and paste its URL into the admin form, and it has to pass
 * this list to be accepted.
 *
 * The store id in the hostname is generated and has already changed once, hence
 * the wildcard rather than a literal name.
 */
export const REMOTE_IMAGE_PATTERNS = [
  {
    protocol: "https",
    hostname: "*.public.blob.vercel-storage.com",
    pathname: "/**",
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
