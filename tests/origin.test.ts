import { describe, expect, it } from "vitest";
import { isSameOrigin } from "@/lib/origin";

/**
 * What a mutating route handler leans on instead of Next's built-in Server
 * Action origin check. The rejection cases are the interesting half: every one
 * of them is a shape that would otherwise have been treated as our own site.
 */
describe("isSameOrigin", () => {
  it("accepts the production host", () => {
    expect(isSameOrigin("https://shemopharm.com", "shemopharm.com")).toBe(true);
  });

  it("accepts localhost with its port, so development is not a special case", () => {
    expect(isSameOrigin("http://localhost:3000", "localhost:3000")).toBe(true);
  });

  it("prefers x-forwarded-host, which is what Vercel sets", () => {
    expect(
      isSameOrigin("https://shemopharm.com", "internal.vercel.app", "shemopharm.com")
    ).toBe(true);
  });

  it("takes the first hop when a proxy chain appended to the header", () => {
    expect(
      isSameOrigin("https://shemopharm.com", null, "shemopharm.com, inner.local")
    ).toBe(true);
  });

  it("ignores casing on both sides", () => {
    expect(isSameOrigin("https://SHEMOPHARM.com", "shemopharm.COM")).toBe(true);
  });

  it("ignores the scheme, by design — the host is what is being asserted", () => {
    // Documented behaviour, not an oversight: HTTPS is enforced by HSTS and the
    // Secure cookie flag, and comparing schemes here would break http://localhost.
    expect(isSameOrigin("http://shemopharm.com", "shemopharm.com")).toBe(true);
  });

  it("refuses a different site", () => {
    expect(isSameOrigin("https://evil.example", "shemopharm.com")).toBe(false);
  });

  it("refuses a subdomain of our host, and our host as a subdomain of theirs", () => {
    expect(isSameOrigin("https://admin.shemopharm.com", "shemopharm.com")).toBe(false);
    expect(isSameOrigin("https://shemopharm.com.evil.example", "shemopharm.com")).toBe(false);
  });

  it("refuses a port mismatch", () => {
    expect(isSameOrigin("http://localhost:3001", "localhost:3000")).toBe(false);
    expect(isSameOrigin("https://shemopharm.com:8443", "shemopharm.com")).toBe(false);
  });

  it("refuses a missing Origin — a browser always sends one on a POST", () => {
    expect(isSameOrigin(null, "shemopharm.com")).toBe(false);
    expect(isSameOrigin(undefined, "shemopharm.com")).toBe(false);
    expect(isSameOrigin("", "shemopharm.com")).toBe(false);
  });

  it("refuses the opaque origin a sandboxed iframe sends", () => {
    expect(isSameOrigin("null", "shemopharm.com")).toBe(false);
  });

  it("refuses a scheme that is not http(s)", () => {
    expect(isSameOrigin("file://shemopharm.com", "shemopharm.com")).toBe(false);
    expect(isSameOrigin("javascript:alert(1)", "shemopharm.com")).toBe(false);
    expect(isSameOrigin("data:text/html,<h1>x", "shemopharm.com")).toBe(false);
  });

  it("refuses an unparseable Origin", () => {
    expect(isSameOrigin("not a url", "shemopharm.com")).toBe(false);
    expect(isSameOrigin("https://", "shemopharm.com")).toBe(false);
  });

  it("refuses when there is no host to compare against", () => {
    expect(isSameOrigin("https://shemopharm.com", null)).toBe(false);
    expect(isSameOrigin("https://shemopharm.com", "")).toBe(false);
    expect(isSameOrigin("https://shemopharm.com", null, "")).toBe(false);
    expect(isSameOrigin("https://shemopharm.com", "", "  ")).toBe(false);
  });
});
