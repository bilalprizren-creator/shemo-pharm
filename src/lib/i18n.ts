/**
 * Locale plumbing shared by proxy, layouts and components.
 * Albanian is the default and lives at the bare URLs (/produktet);
 * English is served under the /en prefix (/en/produktet).
 */
export const LANGS = ["sq", "en"] as const;
export type Lang = (typeof LANGS)[number];
export const DEFAULT_LANG: Lang = "sq";

export function isLang(value: string): value is Lang {
  return (LANGS as readonly string[]).includes(value);
}

/** Prefix an internal path for the given language ("/" stays "/en" for en). */
export function langHref(lang: Lang, path: string): string {
  if (lang === DEFAULT_LANG) return path;
  return path === "/" ? "/en" : `/en${path}`;
}

/**
 * Swap the language on a *browser* pathname, keeping the rest of the path.
 *
 * `search` matters more than it looks: usePathname() drops the query string, so
 * without it the switch on /produktet?kerko=vitamin&faqja=3 lands on a bare
 * listing — the search, the sort, the page and the stock filter all thrown away
 * by a control that only promised to change the language. Accepts the raw
 * "?a=b" or the bare "a=b" that URLSearchParams.toString() returns.
 */
export function switchLangPath(
  pathname: string,
  target: Lang,
  search = ""
): string {
  const bare = pathname === "/en" ? "/" : pathname.replace(/^\/en(?=\/)/, "");
  const query = search.replace(/^\?/, "");
  return `${langHref(target, bare)}${query ? `?${query}` : ""}`;
}

/** Derive the language from a browser pathname (usePathname). */
export function langFromPathname(pathname: string): Lang {
  return pathname === "/en" || pathname.startsWith("/en/") ? "en" : "sq";
}

/** Fill {placeholders} in a dictionary string: fmt("Faqja {n}", { n: 2 }). */
export function fmt(
  template: string,
  vars: Record<string, string | number>
): string {
  return template.replace(/\{(\w+)\}/g, (_, key) =>
    key in vars ? String(vars[key]) : `{${key}}`
  );
}

/**
 * The `alternates.languages` map for one page, including `x-default`.
 *
 * Albanian sits on the bare URLs and English under /en, so `x-default` — the
 * page a search engine offers a visitor whose language matches neither — is the
 * Albanian one. Seven `generateMetadata` blocks declared { sq, en } and stopped
 * there; this is that triple in one place so the eighth cannot forget it.
 *
 * `path` is unprefixed and may carry a query string: "/produktet?faqja=3".
 */
export function languageAlternates(path: string): Record<string, string> {
  const sq = path;
  // "/" is the one path where the English twin is "/en" and not "/en/".
  const en = path === "/" ? "/en" : `/en${path}`;
  return { sq, en, "x-default": sq };
}
