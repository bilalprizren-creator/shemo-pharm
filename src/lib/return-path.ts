/**
 * Where to send somebody back to after logging in.
 *
 * A product page's "log in to see the price" link carries the page it came from
 * (`/kycu?kthehu=/produktet/…`), so a partner lands on the product they were
 * looking at — now with its price — instead of on their account page, which is
 * where every login used to end.
 *
 * The value arrives from a URL and then from a form field, so it is the input
 * of an open redirect unless it is checked: only a path on this site is
 * accepted. Not "//evil.example" (a protocol-relative URL), not a backslash
 * (browsers read "/\evil.example" as one), not a scheme, not the admin panel —
 * which has a login of its own and must never be reached by way of this one.
 * Anything else comes back null and the caller falls back to the account page.
 */
const SAFE_PATH = /^\/(?![/\\])[A-Za-z0-9\-._~/%?=&+]*$/;

export function safeReturnPath(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const path = value.trim();
  if (path.length === 0 || path.length > 300) return null;
  if (!SAFE_PATH.test(path)) return null;
  // Percent-encoding cannot sneak a slash or backslash past the pattern.
  if (/%(2f|5c)/i.test(path)) return null;
  if (/^\/(admin|api)(\/|$|\?)/i.test(path)) return null;
  return path;
}
