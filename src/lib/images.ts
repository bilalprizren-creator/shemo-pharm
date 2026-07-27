/**
 * Where product photography may come from.
 *
 * next/image refuses (and throws for) any remote host that is not configured,
 * which would take down the public product page. So the same allow list feeds
 * three places: next.config.ts (what the optimizer accepts), the admin form
 * (what an editor may paste) and the catalog layer (what reaches a component).
 *
 * Product photography still lives on the old WordPress; add the new host here
 * when the uploads folder is mirrored.
 */
export const REMOTE_IMAGE_PATTERNS = [
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
      url.hostname === p.hostname &&
      url.pathname.startsWith(p.pathname.replace(/\*+$/, ""))
  );
}
