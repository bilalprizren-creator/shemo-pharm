import { headers } from "next/headers";

/**
 * One deployment, two websites.
 *
 * `shop`    — SHEMO PHARM: the full catalogue with cart, wishlist and account.
 * `katalog` — the printed catalogue on its own domain: browse by printed
 *             section, search, article codes, prices behind the partner login,
 *             print to PDF. No cart, no wishlist.
 *
 * They share one codebase, one database and one admin panel, which is the whole
 * point: hiding a product or changing its price in /admin takes effect on both
 * at once. The alternative — a second project reading the same database — would
 * duplicate the layout, the translations, the login and the image pipeline, and
 * leave two admin surfaces to keep in step.
 *
 * The mode is decided by hostname in src/proxy.ts, which passes it on as the
 * `x-site` request header. Nothing infers it from the path.
 */
export type SiteMode = "shop" | "katalog";

export const SITE_MODE_HEADER = "x-site";

/**
 * Hosts that serve the printed-catalogue site. Bare hostnames, no scheme, no
 * port — compared against the request's host with the port stripped.
 *
 * The `www.` form is listed rather than derived: a host this list does not know
 * falls through to the shop, and quietly serving the wrong site is worse than
 * an entry somebody has to add.
 */
export const KATALOG_HOSTS: readonly string[] = [
  "shemo-katalog.com",
  "www.shemo-katalog.com",
  // Local development: katalog.localhost resolves to 127.0.0.1 in Chrome and
  // Firefox without an /etc/hosts entry, so `http://katalog.localhost:3000`
  // exercises the catalogue site against the same dev server.
  "katalog.localhost",
];

/**
 * The origin each site declares as its own — canonical URLs, the sitemap,
 * robots.txt and the JSON-LD graph.
 *
 * Two sites on one deployment means two canonical origins, and getting this
 * wrong is not cosmetic: a catalogue page that canonicalises to the shop's
 * domain tells search engines the catalogue does not exist.
 */
export const SITE_ORIGINS: Record<SiteMode, string> = {
  shop: "https://shemo-pharm.vercel.app",
  katalog: "https://shemo-katalog.com",
};

/** The site a hostname belongs to. Unknown hosts are the shop. */
export function modeForHost(host: string | null | undefined): SiteMode {
  if (!host) return "shop";
  const bare = host.split(",")[0]!.trim().toLowerCase().split(":")[0]!;
  return KATALOG_HOSTS.includes(bare) ? "katalog" : "shop";
}

/**
 * Paths the catalogue mapping must leave alone.
 *
 * Everything else on a catalogue host is a catalogue path: `/` is the contents,
 * `/6-7-cansin` is a section. That is what lets the domain carry short URLs
 * instead of repeating the word "katalog" in every one of them — but it also
 * means any real route that is not a section has to be named here, or the
 * mapping turns it into a section slug that does not exist.
 *
 * Most of these are genuinely shared with the shop — the partner login above
 * all, since prices depend on it. `/kerko` is the exception: it exists only on
 * the catalogue and answers 404 on the shop, but it still must not be folded in.
 */
export const SHARED_PATHS: readonly string[] = [
  "/kerko",
  "/kycu",
  "/regjistrohu",
  "/rikthe-fjalekalimin",
  "/verifikimi",
  "/llogaria",
  "/kontakti",
  "/kushtet",
  "/privatesia",
];

/** Whether `pathname` (already stripped of any /en prefix) is shared. */
export function isSharedPath(pathname: string): boolean {
  return SHARED_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

/**
 * The current request's site. Server components only — it reads a header, which
 * makes the caller dynamic. Every page here already is, because prices depend
 * on the session cookie.
 */
export async function getSiteMode(): Promise<SiteMode> {
  const value = (await headers()).get(SITE_MODE_HEADER);
  return value === "katalog" ? "katalog" : "shop";
}

/**
 * The internal path as it should appear in the address bar of `mode`'s site.
 *
 * The mirror image of the rewrite in src/proxy.ts: the proxy adds `/katalog` on
 * the way in, so links have to drop it on the way out. Without this every link
 * the catalogue renders would point at /katalog/..., which the proxy would then
 * rewrite to /katalog/katalog/... and 404.
 *
 * Pass results through langHref() as usual; this only touches the path.
 */
export function sitePath(mode: SiteMode, path: string): string {
  if (mode !== "katalog") return path;
  if (path === "/katalog") return "/";
  if (path.startsWith("/katalog/")) return path.slice("/katalog".length);
  return path;
}
