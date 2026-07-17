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

/** Swap the language on a *browser* pathname, keeping the rest of the path. */
export function switchLangPath(pathname: string, target: Lang): string {
  const bare = pathname === "/en" ? "/" : pathname.replace(/^\/en(?=\/)/, "");
  return langHref(target, bare);
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
