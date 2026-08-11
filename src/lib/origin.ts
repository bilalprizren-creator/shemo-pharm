/**
 * Same-origin assertion for mutating route handlers.
 *
 * Server Actions get this for free — Next compares the request's Origin against
 * its Host and refuses the mismatch before our code runs. A plain route handler
 * gets none of it, so /api/admin/upload has been relying entirely on the session
 * cookie's SameSite=Lax to keep a cross-site POST from reaching it. Lax does in
 * fact do that job, which is why this is depth rather than a hole being closed
 * — but it costs ten lines and it means the route no longer depends on one
 * cookie attribute being the only thing standing there.
 *
 * Pure, so it is tested directly rather than by trying to forge requests.
 *
 * One consequence worth stating out loud: a mutating route guarded by this
 * refuses any client that does not send an Origin header, which includes plain
 * `curl -X POST`. That is intentional — the admin panel is a browser, and
 * browsers always send Origin on a POST. Scripting against these routes needs
 * `-H "Origin: https://<host>"`.
 */

/**
 * Whether `origin` names the same host the request arrived at.
 *
 * The comparison is host-only, deliberately including the port and deliberately
 * ignoring the scheme: on Vercel both sides are the bare production hostname,
 * and in development both carry :3000 over http. Comparing schemes too would
 * mean special-casing localhost, which is how this kind of check ends up with a
 * bypass in it.
 */
export function isSameOrigin(
  origin: string | null | undefined,
  host: string | null | undefined,
  forwardedHost?: string | null | undefined
): boolean {
  // A proxy chain appends rather than replaces, so the first hop is the one the
  // browser actually addressed. Vercel sets x-forwarded-host; a direct `next
  // start` sets only host.
  const expected = (forwardedHost || host || "").split(",")[0]?.trim().toLowerCase();
  if (!expected) return false;

  if (!origin) return false;
  // A sandboxed iframe or a data: document sends the string "null". It is not a
  // host, and new URL() would throw on it anyway.
  if (origin === "null") return false;

  let url: URL;
  try {
    url = new URL(origin);
  } catch {
    return false;
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") return false;
  if (!url.host) return false;

  return url.host.toLowerCase() === expected;
}

/** The same check, read off a request's headers. */
export function requestIsSameOrigin(request: Request): boolean {
  return isSameOrigin(
    request.headers.get("origin"),
    request.headers.get("host"),
    request.headers.get("x-forwarded-host")
  );
}
