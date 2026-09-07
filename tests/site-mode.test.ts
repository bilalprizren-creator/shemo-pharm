import { describe, expect, it } from "vitest";
import {
  KATALOG_HOSTS,
  SITE_ORIGINS,
  isSharedPath,
  modeForHost,
  sitePath,
} from "@/lib/site-mode";

/**
 * One deployment answers on two domains, and these three functions are the
 * whole of that decision. Getting any of them wrong does not throw — it serves
 * the wrong site, or renders links that 404, which is why they are tested
 * rather than trusted.
 */

describe("modeForHost", () => {
  it("recognises the catalogue domain", () => {
    expect(modeForHost("shemo-katalog.com")).toBe("katalog");
    expect(modeForHost("www.shemo-katalog.com")).toBe("katalog");
  });

  it("ignores the port, so local development matches too", () => {
    expect(modeForHost("katalog.localhost:3000")).toBe("katalog");
  });

  it("is case-insensitive — hostnames are", () => {
    expect(modeForHost("SHEMO-Katalog.com")).toBe("katalog");
  });

  it("takes the first host when a proxy chained several", () => {
    // x-forwarded-host arrives comma-joined behind more than one proxy.
    expect(modeForHost("shemo-katalog.com, internal.vercel.app")).toBe("katalog");
  });

  it("falls back to the shop for anything it does not know", () => {
    expect(modeForHost("shemo-pharm.vercel.app")).toBe("shop");
    expect(modeForHost("localhost:3000")).toBe("shop");
    expect(modeForHost(null)).toBe("shop");
    expect(modeForHost("")).toBe("shop");
    // Not a suffix match: a lookalike domain must not inherit the catalogue.
    expect(modeForHost("evil-shemo-katalog.com")).toBe("shop");
  });
});

describe("isSharedPath", () => {
  it("keeps the partner login shared — prices depend on it", () => {
    expect(isSharedPath("/kycu")).toBe(true);
  });

  it("covers nested paths under a shared root", () => {
    expect(isSharedPath("/llogaria/porosite")).toBe(true);
  });

  it("does not match a path that merely starts with the same letters", () => {
    expect(isSharedPath("/kycuria")).toBe(false);
  });

  it("treats catalogue paths as not shared", () => {
    expect(isSharedPath("/")).toBe(false);
    expect(isSharedPath("/6-7-cansin")).toBe(false);
  });
});

describe("sitePath", () => {
  it("leaves the shop untouched", () => {
    expect(sitePath("shop", "/katalog")).toBe("/katalog");
    expect(sitePath("shop", "/katalog/6-7-cansin")).toBe("/katalog/6-7-cansin");
  });

  it("puts the catalogue's own contents at the root", () => {
    expect(sitePath("katalog", "/katalog")).toBe("/");
  });

  it("drops the prefix from section and print paths", () => {
    expect(sitePath("katalog", "/katalog/6-7-cansin")).toBe("/6-7-cansin");
    expect(sitePath("katalog", "/katalog/shtyp")).toBe("/shtyp");
  });

  /** The proxy adds the prefix on the way in; this removes it on the way out.
   *  If they disagree, every catalogue link 404s. */
  it("round-trips with the proxy's rewrite", () => {
    for (const shown of ["/", "/6-7-cansin", "/shtyp"]) {
      const rewritten = shown === "/" ? "/katalog" : `/katalog${shown}`;
      expect(sitePath("katalog", rewritten)).toBe(shown);
    }
  });

  it("leaves shared paths alone", () => {
    expect(sitePath("katalog", "/kycu")).toBe("/kycu");
    expect(sitePath("katalog", "/kontakti")).toBe("/kontakti");
  });
});

describe("SITE_ORIGINS", () => {
  it("gives each site a different canonical origin", () => {
    expect(SITE_ORIGINS.shop).not.toBe(SITE_ORIGINS.katalog);
  });

  it("points the catalogue origin at a host the proxy will recognise", () => {
    const host = new URL(SITE_ORIGINS.katalog).host;
    expect(KATALOG_HOSTS).toContain(host);
    expect(modeForHost(host)).toBe("katalog");
  });
});

describe("every catalogue route is reachable", () => {
  /**
   * The catalogue mapping turns any unlisted path into a section slug, so a
   * real route missing from SHARED_PATHS 404s with no other symptom. This is
   * the list of routes that are not sections.
   */
  it("leaves the catalogue's own non-section routes unmapped", () => {
    for (const path of ["/kerko", "/kycu", "/llogaria"]) {
      expect(isSharedPath(path)).toBe(true);
      expect(sitePath("katalog", path)).toBe(path);
    }
  });
});
