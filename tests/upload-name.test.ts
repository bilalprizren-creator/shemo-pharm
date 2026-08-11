import { describe, expect, it } from "vitest";
import { UPLOAD_PREFIX, blobObjectName, isAllowedImageSrc } from "@/lib/images";

/**
 * The upload route names every stored object itself. These are the properties
 * that make that worth doing — if the name were still coming from the caller,
 * each one below would be the caller's promise rather than ours.
 */

const HEX = "0123456789abcdef0123456789abcdef";

describe("blobObjectName", () => {
  it("names the object after the sniffed format, not any filename", () => {
    expect(blobObjectName("png", HEX)).toBe(`${UPLOAD_PREFIX}${HEX}.png`);
    expect(blobObjectName("jpeg", HEX)).toBe(`${UPLOAD_PREFIX}${HEX}.jpg`);
    expect(blobObjectName("webp", HEX)).toBe(`${UPLOAD_PREFIX}${HEX}.webp`);
  });

  it("puts everything under the products prefix", () => {
    expect(blobObjectName("png", HEX).startsWith("products/")).toBe(true);
  });

  it("has exactly one path separator, so nothing can nest or traverse", () => {
    const name = blobObjectName("webp", HEX);
    expect(name.split("/")).toHaveLength(2);
    expect(name).not.toContain("..");
    expect(name).not.toContain("\\");
  });

  it("carries exactly one extension", () => {
    expect(blobObjectName("jpeg", HEX).match(/\./g)).toHaveLength(1);
  });

  /**
   * The guard exists because the entropy is the whole security property. A
   * caller that passed a short, uppercase or non-hex string would produce a
   * guessable name and the function would otherwise happily return it.
   */
  it("refuses anything that is not 32 lowercase hex characters", () => {
    expect(() => blobObjectName("png", "")).toThrow();
    expect(() => blobObjectName("png", "abc")).toThrow();
    expect(() => blobObjectName("png", HEX.toUpperCase())).toThrow();
    expect(() => blobObjectName("png", HEX + "0")).toThrow();
    expect(() => blobObjectName("png", HEX.slice(0, 31))).toThrow();
    expect(() => blobObjectName("png", "../../etc/passwd0123456789abcdef")).toThrow();
    expect(() => blobObjectName("png", `${HEX.slice(0, 28)}.png`)).toThrow();
  });

  it("produces a name the old upload pattern would also have accepted", () => {
    // The route it replaced enforced this shape on a client-chosen path. Keeping
    // the generated name inside it means nothing downstream had to change.
    const legacy = /^products\/[a-z0-9][a-z0-9._-]{0,79}\.(png|jpe?g|webp)$/;
    for (const format of ["png", "jpeg", "webp"] as const) {
      expect(blobObjectName(format, HEX)).toMatch(legacy);
    }
  });

  it("produces a path the product form will accept back", () => {
    // The URL the store returns is re-checked with isAllowedImageSrc on save,
    // and a local path is the other thing that check allows.
    expect(isAllowedImageSrc(`/${blobObjectName("png", HEX)}`)).toBe(true);
  });
});
