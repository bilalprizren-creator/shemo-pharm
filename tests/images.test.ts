import { describe, expect, it } from "vitest";
import { isAllowedImageSrc } from "@/lib/images";

/**
 * This list is a security boundary, not a convenience: next/image throws for an
 * unconfigured host, which takes the whole product page down with it, and the
 * admin form validates against exactly this function. Every case below is a way
 * the check could be talked into saying yes.
 */
describe("isAllowedImageSrc", () => {
  it("accepts local paths under public/", () => {
    expect(isAllowedImageSrc("/products/foto.png")).toBe(true);
    expect(isAllowedImageSrc("/photos/depo.jpg")).toBe(true);
  });

  it("rejects a protocol-relative URL disguised as a local path", () => {
    expect(isAllowedImageSrc("//evil.com/foto.png")).toBe(false);
  });

  it("accepts the configured WordPress uploads path only", () => {
    expect(
      isAllowedImageSrc("https://shemopharm.com/wp-content/uploads/2022/05/web.jpg")
    ).toBe(true);
    expect(isAllowedImageSrc("https://shemopharm.com/anything-else.jpg")).toBe(false);
  });

  it("rejects http where https is required", () => {
    expect(
      isAllowedImageSrc("http://shemopharm.com/wp-content/uploads/web.jpg")
    ).toBe(false);
  });

  it("rejects hosts that merely end with an allowed name", () => {
    expect(
      isAllowedImageSrc("https://notshemopharm.com/wp-content/uploads/x.jpg")
    ).toBe(false);
    expect(
      isAllowedImageSrc("https://shemopharm.com.evil.test/wp-content/uploads/x.jpg")
    ).toBe(false);
  });

  it("treats the blob wildcard as exactly one label, as next/image does", () => {
    expect(
      isAllowedImageSrc("https://abc123.public.blob.vercel-storage.com/products/x.png")
    ).toBe(true);
    // Two labels where the pattern allows one.
    expect(
      isAllowedImageSrc("https://a.b.public.blob.vercel-storage.com/products/x.png")
    ).toBe(false);
    // No label at all.
    expect(
      isAllowedImageSrc("https://public.blob.vercel-storage.com/products/x.png")
    ).toBe(false);
  });

  it("rejects empty, whitespace and unparseable values", () => {
    expect(isAllowedImageSrc("")).toBe(false);
    expect(isAllowedImageSrc("   ")).toBe(false);
    expect(isAllowedImageSrc("not a url")).toBe(false);
    expect(isAllowedImageSrc("javascript:alert(1)")).toBe(false);
    expect(isAllowedImageSrc("data:image/png;base64,AAAA")).toBe(false);
  });
});
