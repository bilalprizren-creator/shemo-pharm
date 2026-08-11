import { describe, expect, it } from "vitest";
import {
  CSP_HEADER,
  CSP_REPORT_PATH,
  REPORTING_ENDPOINTS_VALUE,
  REPORT_ONLY,
  contentSecurityPolicy,
} from "@/lib/csp";

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
   * The uploader used to post the file from the browser straight to
   * vercel.com/api/blob, so connect-src had to name a third party. It posts to
   * our own route now, which means the browser has no reason to reach off-origin
   * at all — a stronger assertion than the allowance it replaces, and one that
   * fails loudly if anybody reintroduces a client-direct upload without
   * revisiting the policy.
   */
  it("needs no off-origin connect-src — the upload goes through our own route", () => {
    const csp = contentSecurityPolicy(NONCE, false);
    const connectSrc = csp
      .split(";")
      .map((d) => d.trim())
      .find((d) => d.startsWith("connect-src"));
    expect(connectSrc).toBe("connect-src 'self'");
    expect(csp).not.toContain("https://vercel.com");
  });

  /**
   * Without a collector the policy's violations exist only in whichever browser
   * console happens to be open, and the decision to enforce it has no evidence
   * behind it. Both spellings are sent: report-to is current, report-uri is
   * deprecated and still the one several browsers act on.
   */
  it("names a collector, in both the current and the deprecated spelling", () => {
    const csp = contentSecurityPolicy(NONCE, false);
    expect(csp).toContain(`report-uri ${CSP_REPORT_PATH}`);
    expect(csp).toContain("report-to csp-endpoint");
    // The group name has to match what the response header declares, or the
    // browser cannot resolve it.
    expect(REPORTING_ENDPOINTS_VALUE).toContain("csp-endpoint=");
    expect(REPORTING_ENDPOINTS_VALUE).toContain(CSP_REPORT_PATH);
  });

  /**
   * Browsers ignore upgrade-insecure-requests in a report-only policy and log an
   * error saying so, which would bury the violations report-only mode exists to
   * surface — so it must appear exactly when the policy is enforced and not
   * before.
   */
  it("holds upgrade-insecure-requests back until the policy is enforced", () => {
    const csp = contentSecurityPolicy(NONCE, false);
    expect(csp.includes("upgrade-insecure-requests")).toBe(!REPORT_ONLY);
  });

  it("sends the policy under the header that matches its mode", () => {
    expect(CSP_HEADER).toBe(
      REPORT_ONLY ? "Content-Security-Policy-Report-Only" : "Content-Security-Policy"
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
