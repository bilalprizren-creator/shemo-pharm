import { describe, expect, it } from "vitest";
import { isAllowedImageSrc } from "@/lib/images";
import { allowed, chosenSource, classify } from "../scripts/verify-images.mjs";

/**
 * scripts/verify-images.mjs restates the allow list from src/lib/images.ts,
 * because a .mjs script cannot import that TypeScript module. This is the seam
 * that keeps the copy honest: add a host to one and not the other and these
 * fail.
 */
describe("verify-images against src/lib/images.ts", () => {
  const urls = [
    "/products/0001-anti-decubitus-matress-shm-400-0001.webp",
    "/products/foto.png",
    "//evil.example.com/x.png",
    "",
    "   ",
    "not a url",
    "https://mk7yggs4acpdzy1o.public.blob.vercel-storage.com/products/x.webp",
    "https://other.public.blob.vercel-storage.com/products/x.webp",
    "https://deep.nested.public.blob.vercel-storage.com/products/x.webp",
    "https://public.blob.vercel-storage.com/products/x.webp",
    "https://shemopharm.com/wp-content/uploads/2022/07/7159.jpg",
    "https://shemopharm.com/elsewhere/7159.jpg",
    "http://shemopharm.com/wp-content/uploads/2022/07/7159.jpg",
    "https://evil.example.com/x.png",
  ];

  it.each(urls)("agrees on %j", (url) => {
    expect(allowed(url)).toBe(isAllowedImageSrc(url));
  });
});

describe("classify", () => {
  // The file check is injected so the test says what it means rather than
  // depending on which photos happen to be in public/products today.
  const onDisk = (paths: string[]) => (p: string) => paths.includes(p);

  it("names a local path that exists, and one that does not", () => {
    expect(classify("/products/a.webp", onDisk(["products/a.webp"]))).toBe("local");
    expect(classify("/products/a.webp", onDisk([]))).toBe("missing file");
  });

  it("names the suspended blob store, which the allow list still accepts", () => {
    const url = "https://mk7yggs4acpdzy1o.public.blob.vercel-storage.com/products/x.webp";
    expect(isAllowedImageSrc(url)).toBe(true);
    expect(classify(url)).toBe("suspended blob");
  });

  it("separates the old WordPress host from a host nobody allows", () => {
    expect(classify("https://shemopharm.com/wp-content/uploads/x.jpg")).toBe(
      "remote (wordpress)"
    );
    expect(classify("https://evil.example.com/x.png")).toBe("rejected host");
  });

  it("names an absent source", () => {
    expect(classify(null)).toBe("empty");
    expect(classify("")).toBe("empty");
  });
});

describe("chosenSource", () => {
  it("prefers the editor's override, the way productImage does", () => {
    expect(
      chosenSource({ images: ["/products/a.webp"], image_override: "/products/b.webp" })
    ).toBe("/products/b.webp");
  });

  it("otherwise takes the first image the allow list accepts", () => {
    expect(
      chosenSource({
        images: ["https://evil.example.com/x.png", "/products/a.webp"],
        image_override: null,
      })
    ).toBe("/products/a.webp");
  });

  it("is null when nothing survives, which is the blank card", () => {
    expect(
      chosenSource({ images: ["https://evil.example.com/x.png"], image_override: null })
    ).toBe(null);
    expect(chosenSource({ images: [], image_override: null })).toBe(null);
  });
});
