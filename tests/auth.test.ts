import { describe, expect, it } from "vitest";
import {
  hashPassword,
  readVerificationToken,
  signVerificationToken,
  verifyPassword,
} from "@/lib/auth";

describe("password hashing", () => {
  it("round-trips a password", () => {
    const stored = hashPassword("Demo2026!");
    expect(verifyPassword("Demo2026!", stored)).toBe(true);
    expect(verifyPassword("demo2026!", stored)).toBe(false);
    expect(verifyPassword("", stored)).toBe(false);
  });

  it("salts, so the same password never stores the same hash", () => {
    expect(hashPassword("Demo2026!")).not.toBe(hashPassword("Demo2026!"));
  });

  /**
   * The reason the length check exists: timingSafeEqual throws on a length
   * mismatch and Buffer.from truncates at the first non-hex character, so a row
   * written by anything other than hashPassword — a hand-edited row, a botched
   * import — used to turn a wrong password into a 500 error page.
   */
  it("refuses a malformed stored hash instead of throwing", () => {
    expect(verifyPassword("x", "")).toBe(false);
    expect(verifyPassword("x", "no-colon")).toBe(false);
    expect(verifyPassword("x", "salt:")).toBe(false);
    expect(verifyPassword("x", "salt:zzzz")).toBe(false);
    expect(verifyPassword("x", "salt:abcd")).toBe(false); // valid hex, wrong length
  });
});

describe("verification tokens", () => {
  it("proves the address it was issued for, lower-cased", async () => {
    const token = await signVerificationToken("  Partner@Example.com  ");
    const result = await readVerificationToken(token);
    expect(result).toEqual({ ok: true, email: "partner@example.com" });
  });

  it("rejects a forged or empty token", async () => {
    expect(await readVerificationToken("")).toEqual({
      ok: false,
      reason: "invalid",
    });
    expect(await readVerificationToken("not.a.token")).toEqual({
      ok: false,
      reason: "invalid",
    });
  });

  /**
   * Session cookies, verification links and reset links are all signed with
   * AUTH_SECRET, so the signature alone proves nothing about what a token is
   * for. Each carries a `purpose` and each reader checks it — without that, a
   * verification link out of an inbox would authenticate as a session.
   */
  it("does not accept a token minted for another purpose", async () => {
    const { SignJWT } = await import("jose");
    const secret = new TextEncoder().encode(process.env.AUTH_SECRET);
    const sessionToken = await new SignJWT({
      email: "partner@example.com",
      purpose: "session",
    })
      .setProtectedHeader({ alg: "HS256" })
      .setSubject("partner@example.com")
      .setIssuedAt()
      .setExpirationTime("7d")
      .sign(secret);

    expect(await readVerificationToken(sessionToken)).toEqual({
      ok: false,
      reason: "invalid",
    });
  });

  it("reports expiry separately, so the page can offer a new link", async () => {
    const { SignJWT } = await import("jose");
    const secret = new TextEncoder().encode(process.env.AUTH_SECRET);
    const expired = await new SignJWT({ purpose: "verify-email" })
      .setProtectedHeader({ alg: "HS256" })
      .setSubject("partner@example.com")
      .setIssuedAt(Math.floor(Date.now() / 1000) - 60 * 60 * 48)
      .setExpirationTime(Math.floor(Date.now() / 1000) - 60 * 60 * 24)
      .sign(secret);

    expect(await readVerificationToken(expired)).toEqual({
      ok: false,
      reason: "expired",
    });
  });
});
