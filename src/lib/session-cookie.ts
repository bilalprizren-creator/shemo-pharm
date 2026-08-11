/**
 * The session cookie's shape, and the arithmetic that decides whether a session
 * is still good.
 *
 * Split out of auth.ts for one reason: auth.ts cannot be imported by a test. It
 * pulls in `next/headers`, a database client and `server-only`, so the parts of
 * it most worth pinning — which flags the cookie carries, whether a revoked
 * session is actually refused — had no test at all. Everything here is pure.
 */

export const SESSION_COOKIE = "shemo_session";

/** How long a customer's session lasts. */
export const SESSION_DAYS = 7;

/**
 * How long an admin's does.
 *
 * Shorter on purpose. Until now both were seven days, which meant a captured
 * admin cookie was good for a week against the panel that can delete the
 * catalogue. The panel is used a few times a week, so a daily login is a small
 * price; if the editors find it tiresome, three days is a defensible compromise
 * and one line.
 */
export const ADMIN_SESSION_DAYS = 1;

export interface SessionCookieOptions {
  httpOnly: true;
  sameSite: "lax";
  secure: boolean;
  maxAge: number;
  path: "/";
}

/**
 * The attributes the session cookie is always set with.
 *
 * `secure` is keyed on development rather than on production, which is not the
 * same condition and was the bug: `NODE_ENV === "production"` is false on a
 * preview deployment and in a test build, both of which are served over HTTPS
 * and were therefore shipping the session cookie without Secure. `!isDev` sends
 * it everywhere except the one place it cannot work, `http://localhost`.
 *
 * `sameSite: "lax"` rather than "strict": strict would drop the cookie on any
 * cross-site navigation *into* the site, so following the verification link out
 * of an email would land the customer logged out. Lax still withholds the cookie
 * from cross-site POSTs, which is the CSRF-relevant half.
 *
 * Not renamed to `__Host-shemo_session`, though it already satisfies every
 * condition that prefix enforces (Secure, Path=/, no Domain). The prefix would
 * only stop an attacker who can *set* a cookie on a sibling subdomain or over
 * plain http, against a cookie that is already httpOnly + Lax + Secure — and it
 * costs a rename, which means a dual-read grace path and a reminder to delete it
 * later, plus Safari refusing it on http://localhost. If it is ever wanted: set
 * both names for one SESSION_DAYS window, read the prefixed one first and fall
 * back, then drop the old name and the fallback together.
 */
export function sessionCookieOptions({
  isDev,
  days,
}: {
  isDev: boolean;
  days: number;
}): SessionCookieOptions {
  return {
    httpOnly: true,
    sameSite: "lax",
    secure: !isDev,
    maxAge: days * 24 * 60 * 60,
    path: "/",
  };
}

/**
 * Whether a session token issued at `iatSeconds` was invalidated by a
 * revocation recorded at `validFromIso`.
 *
 * The session is a signed JWT and nothing else — there is no session table and
 * no token id — so until now deleting the cookie was the entire logout. A
 * cookie captured beforehand kept working for its full lifetime, and a password
 * reset explicitly left other sessions alive. One nullable timestamp per user
 * fixes that: anything issued before it is refused.
 *
 * Compared against `iat`, which jose already puts on every token, rather than a
 * version counter — so no cookie needs reissuing and nothing has to migrate.
 *
 * The boundary is `>=`, and that matters in exactly one place: the password
 * reset flow signs the customer straight back in immediately after recording the
 * revocation. Both sides are whole seconds, so the new cookie's `iat` lands at
 * or after the revocation instant and survives it — which is the intended
 * outcome, and would be an immediate logout with a strict comparison.
 */
export function sessionRevoked(
  iatSeconds: number | null | undefined,
  validFromIso: string | null | undefined
): boolean {
  if (!validFromIso) return false; // nothing revoked for this account

  const validFrom = Date.parse(validFromIso);
  // An unparseable timestamp must not become a silent "not revoked" — but it
  // also must not lock out every user over a bad column value. Treating it as no
  // revocation is the safer of two bad answers, and it is logged by the caller.
  if (Number.isNaN(validFrom)) return false;

  // A token with no iat cannot be placed relative to the revocation. Refuse it:
  // nothing this project signs omits iat, so this is a token we did not make.
  if (typeof iatSeconds !== "number" || !Number.isFinite(iatSeconds)) return true;

  return iatSeconds < Math.floor(validFrom / 1000);
}
