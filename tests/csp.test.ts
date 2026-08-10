import { describe, expect, it } from "vitest";
import { contentSecurityPolicy } from "@/lib/csp";

/**
 * Next re-reads the policy it was handed and pulls the nonce back out of it, so
 * that it can stamp the framework scripts. If that extraction ever fails the
 * page still renders — with every script unnonced, and the whole policy quietly
 * doing nothing. This is a copy of the regex Next uses
 * (server/app-render/get-script-nonce-from-header.js), so a directive reshuffle
 * that breaks the handshake fails here instead of in production.
 */
const CSP_NONCE_SOURCE_REGEX = /^'nonce-([A-Za-z0-9+/_-]+={0,2})'$/;

function nonceNextWouldFind(header: string): string | undefined {
  const directives = header.split(";").map((d) => d.trim());
  const directive =
    directives.find((d) => d.startsWith("script-src")) ??
    directives.find((d) => d.startsWith("default-src"));
  if (!directive) return undefined;
  for (const source of directive.split(/\s+/).slice(1)) {
    const match = source.trim().match(CSP_NONCE_SOURCE_REGEX);
    if (match) return match[1];
  }
}

const NONCE = Buffer.from("11111111-2222-3333-4444-555555555555").toString("base64");

describe("contentSecurityPolicy", () => {
  it("hands Next a nonce it can find again", () => {
    expect(nonceNextWouldFind(contentSecurityPolicy(NONCE, false))).toBe(NONCE);
  });

  it("keeps script-src ahead of any other src directive Next might match first", () => {
    const directives = contentSecurityPolicy(NONCE, false)
      .split(";")
      .map((d) => d.trim());
    const scriptSrc = directives.findIndex((d) => d.startsWith("script-src"));
    const defaultSrc = directives.findIndex((d) => d.startsWith("default-src"));
    expect(scriptSrc).toBeGreaterThan(-1);
    expect(defaultSrc).toBeLessThan(scriptSrc);
  });

  it("allows inline style attributes but not inline stylesheets", () => {
    const csp = contentSecurityPolicy(NONCE, false);
    // framer-motion animates by writing element style attributes.
    expect(csp).toContain("style-src-attr 'unsafe-inline'");
    const styleSrc = csp
      .split(";")
      .map((d) => d.trim())
      .find((d) => d.startsWith("style-src ")) as string;
    expect(styleSrc).not.toContain("unsafe-inline");
  });

  /**
   * The upload posts to vercel.com/api/blob, not to the store's own hostname —
   * naming the store host here instead is the mistake that looks correct and
   * only shows up the day the policy stops being report-only.
   */
  it("lets the admin uploader reach the blob API", () => {
    expect(contentSecurityPolicy(NONCE, false)).toContain(
      "connect-src 'self' https://vercel.com"
    );
  });

  it("carries both product image hosts", () => {
    const csp = contentSecurityPolicy(NONCE, false);
    expect(csp).toContain("https://*.public.blob.vercel-storage.com");
    expect(csp).toContain("https://shemopharm.com");
  });

  it("permits eval in development only — React needs it for stack traces", () => {
    expect(contentSecurityPolicy(NONCE, true)).toContain("'unsafe-eval'");
    expect(contentSecurityPolicy(NONCE, false)).not.toContain("'unsafe-eval'");
  });

  it("keeps the clickjacking and injection floors", () => {
    const csp = contentSecurityPolicy(NONCE, false);
    expect(csp).toContain("object-src 'none'");
    expect(csp).toContain("base-uri 'self'");
    expect(csp).toContain("form-action 'self'");
    expect(csp).toContain("frame-ancestors 'self'");
  });
});
