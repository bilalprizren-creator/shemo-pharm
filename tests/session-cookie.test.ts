import { describe, expect, it } from "vitest";
import {
  ADMIN_SESSION_DAYS,
  SESSION_COOKIE,
  SESSION_DAYS,
  sessionCookieOptions,
  sessionRevoked,
} from "@/lib/session-cookie";

/**
 * auth.ts cannot be imported by a test — it pulls in next/headers, the database
 * client and `server-only`. So the two things about the session most worth
 * pinning live in a pure module, and this is them: the flags the cookie is
 * always set with, and whether a revoked session is actually refused.
 */

describe("sessionCookieOptions", () => {
  const prod = sessionCookieOptions({ isDev: false, days: SESSION_DAYS });
  const dev = sessionCookieOptions({ isDev: true, days: SESSION_DAYS });

  it("is never readable from JavaScript", () => {
    expect(prod.httpOnly).toBe(true);
    expect(dev.httpOnly).toBe(true);
  });

  it("withholds itself from cross-site POSTs", () => {
    // Lax, not Strict: Strict would drop the cookie on a cross-site navigation
    // into the site, so following a verification link out of an email would
    // arrive logged out. Lax still withholds it from a cross-site POST, which is
    // the half that matters for CSRF.
    expect(prod.sameSite).toBe("lax");
  });

  it("covers the whole site", () => {
    expect(prod.path).toBe("/");
  });

  /**
   * The bug this replaced: `secure` was keyed on NODE_ENV === "production",
   * which is false on a preview deployment and in a test build — both served
   * over HTTPS, both therefore sending the session cookie in the clear.
   */
  it("is Secure everywhere except development", () => {
    expect(prod.secure).toBe(true);
    expect(dev.secure).toBe(false);
    expect(sessionCookieOptions({ isDev: false, days: 1 }).secure).toBe(true);
  });

  it("expires in exactly the days it was asked for", () => {
    expect(prod.maxAge).toBe(SESSION_DAYS * 86400);
    expect(sessionCookieOptions({ isDev: false, days: ADMIN_SESSION_DAYS }).maxAge).toBe(
      ADMIN_SESSION_DAYS * 86400
    );
  });

  it("gives an admin a shorter session than a customer", () => {
    expect(ADMIN_SESSION_DAYS).toBeLessThan(SESSION_DAYS);
  });

  it("keeps the cookie name it has always had, so nobody is logged out", () => {
    expect(SESSION_COOKIE).toBe("shemo_session");
  });
});

describe("sessionRevoked", () => {
  const iat = (iso: string) => Math.floor(Date.parse(iso) / 1000);
  const NOON = "2026-08-11T12:00:00.000Z";

  it("lets everything through for an account that has revoked nothing", () => {
    expect(sessionRevoked(iat(NOON), null)).toBe(false);
    expect(sessionRevoked(iat(NOON), undefined)).toBe(false);
    expect(sessionRevoked(0, null)).toBe(false);
  });

  it("refuses a token issued before the revocation", () => {
    expect(sessionRevoked(iat("2026-08-11T11:59:59.000Z"), NOON)).toBe(true);
    expect(sessionRevoked(iat("2026-08-04T12:00:00.000Z"), NOON)).toBe(true);
  });

  it("accepts a token issued after it", () => {
    expect(sessionRevoked(iat("2026-08-11T12:00:01.000Z"), NOON)).toBe(false);
  });

  /**
   * The one boundary that has real consequences. The password reset flow revokes
   * every session and then immediately signs the customer back in, so the new
   * cookie is minted in the same second as the revocation it must survive. A
   * strict comparison here would log them straight out of the session they just
   * created.
   */
  it("accepts a token issued in the same second as the revocation", () => {
    expect(sessionRevoked(iat(NOON), NOON)).toBe(false);
    // Sub-second precision on the revocation must not change that, since iat is
    // only ever whole seconds.
    expect(sessionRevoked(iat(NOON), "2026-08-11T12:00:00.750Z")).toBe(false);
  });

  it("refuses a token with no issue time at all", () => {
    // Nothing this project signs omits iat, so such a token is not ours.
    expect(sessionRevoked(null, NOON)).toBe(true);
    expect(sessionRevoked(undefined, NOON)).toBe(true);
    expect(sessionRevoked(Number.NaN, NOON)).toBe(true);
  });

  it("does not lock everyone out over an unreadable timestamp", () => {
    // The safer of two bad answers: a corrupt column value must not become a
    // site-wide logout.
    expect(sessionRevoked(iat(NOON), "not a date")).toBe(false);
    expect(sessionRevoked(iat(NOON), "")).toBe(false);
  });
});
