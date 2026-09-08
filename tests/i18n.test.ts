import { describe, expect, it } from "vitest";
import { fmt, langFromPathname, langHref, switchLangPath, languageAlternates } from "@/lib/i18n";

describe("langHref", () => {
  it("leaves Albanian paths bare — sq lives at the root", () => {
    expect(langHref("sq", "/")).toBe("/");
    expect(langHref("sq", "/produktet")).toBe("/produktet");
  });

  it("prefixes English, without leaving a trailing slash on the home page", () => {
    expect(langHref("en", "/")).toBe("/en");
    expect(langHref("en", "/produktet")).toBe("/en/produktet");
  });
});

describe("switchLangPath", () => {
  it("swaps the prefix both ways", () => {
    expect(switchLangPath("/produktet", "en")).toBe("/en/produktet");
    expect(switchLangPath("/en/produktet", "sq")).toBe("/produktet");
    expect(switchLangPath("/en", "sq")).toBe("/");
    expect(switchLangPath("/", "en")).toBe("/en");
  });

  it("does not strip an /en that is only the start of a real segment", () => {
    expect(switchLangPath("/energji", "en")).toBe("/en/energji");
  });

  /**
   * The regression this function was changed for: usePathname() drops the query
   * string, so the language pill used to throw away the customer's search, sort,
   * page and stock filter.
   */
  it("carries the query string across the switch", () => {
    expect(switchLangPath("/produktet", "en", "kerko=vitamin&faqja=3")).toBe(
      "/en/produktet?kerko=vitamin&faqja=3"
    );
    expect(switchLangPath("/en/produktet", "sq", "?stok=1")).toBe(
      "/produktet?stok=1"
    );
  });

  it("adds no question mark when there is nothing to carry", () => {
    expect(switchLangPath("/produktet", "en", "")).toBe("/en/produktet");
    expect(switchLangPath("/produktet", "en", "?")).toBe("/en/produktet");
  });
});

describe("langFromPathname", () => {
  it("reads the locale off a browser path", () => {
    expect(langFromPathname("/en")).toBe("en");
    expect(langFromPathname("/en/produktet")).toBe("en");
    expect(langFromPathname("/produktet")).toBe("sq");
    expect(langFromPathname("/energji")).toBe("sq");
  });
});

describe("fmt", () => {
  it("fills placeholders", () => {
    expect(fmt("Faqja {n} nga {total}", { n: 2, total: 86 })).toBe("Faqja 2 nga 86");
  });

  it("leaves an unknown placeholder visible rather than printing undefined", () => {
    expect(fmt("Rezultatet për {q}", { name: "x" })).toBe("Rezultatet për {q}");
  });
});

describe("languageAlternates", () => {
  it("declares Albanian as the x-default", () => {
    // Albanian sits on the bare URLs, so it is what a visitor whose language
    // matches neither should be offered. Seven generateMetadata blocks
    // declared { sq, en } and stopped there.
    expect(languageAlternates("/produktet")).toEqual({
      sq: "/produktet",
      en: "/en/produktet",
      "x-default": "/produktet",
    });
  });

  it("keeps a query string on all three", () => {
    expect(languageAlternates("/produktet?faqja=3")).toEqual({
      sq: "/produktet?faqja=3",
      en: "/en/produktet?faqja=3",
      "x-default": "/produktet?faqja=3",
    });
  });

  it("does not leave a trailing slash on the English root", () => {
    // The catalogue domain's contents page is "/", where the twin is "/en"
    // and not "/en/" — the redirect that would follow is a wasted hop in a
    // hreflang map, and the two URLs are not the same string to a crawler.
    expect(languageAlternates("/")).toEqual({
      sq: "/",
      en: "/en",
      "x-default": "/",
    });
  });
});
