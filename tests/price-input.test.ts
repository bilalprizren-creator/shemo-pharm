import { describe, expect, it } from "vitest";
import { parsePriceEuros } from "@/lib/price-input";

/**
 * The inline price field in /admin/produktet is the one place a price is typed
 * in a hurry, next to forty-nine others. These pin what it accepts — above all
 * the comma, which is how the decimal separator is written here and which
 * z.coerce.number() silently turns into NaN.
 */
describe("parsePriceEuros", () => {
  it("reads a comma and a dot as the same decimal separator", () => {
    expect(parsePriceEuros("10,50")).toBe(1050);
    expect(parsePriceEuros("10.50")).toBe(1050);
  });

  it("accepts the shapes a keyboard produces", () => {
    expect(parsePriceEuros("10.5")).toBe(1050);
    expect(parsePriceEuros("10")).toBe(1000);
    expect(parsePriceEuros("  7,90  ")).toBe(790);
    expect(parsePriceEuros("0")).toBe(0);
  });

  it("rounds to the cent rather than truncating", () => {
    expect(parsePriceEuros("1.999")).toBe(200);
  });

  it("refuses what is not a price", () => {
    expect(parsePriceEuros("")).toBeNull();
    expect(parsePriceEuros("   ")).toBeNull();
    expect(parsePriceEuros("abc")).toBeNull();
    expect(parsePriceEuros("-1")).toBeNull();
    // Two separators are ambiguous — 1.234,56 and 1,234.56 mean different
    // amounts to different people, so neither is guessed at.
    expect(parsePriceEuros("1,234.56")).toBeNull();
  });

  it("refuses amounts that would overflow the integer column", () => {
    expect(parsePriceEuros("99999999")).toBeNull();
  });

  it("refuses notation Number() would happily misread", () => {
    // Each of these is a plausible mistype, and each one Number() turns into a
    // number that is nothing like what was meant: 16, 1000, 1000.
    expect(parsePriceEuros("0x10")).toBeNull();
    expect(parsePriceEuros("1e3")).toBeNull();
    expect(parsePriceEuros("1e400")).toBeNull();
    expect(parsePriceEuros("Infinity")).toBeNull();
    expect(parsePriceEuros("12 50")).toBeNull();
    expect(parsePriceEuros("12€")).toBeNull();
  });

  it("still takes the sloppy but unambiguous forms", () => {
    expect(parsePriceEuros(",5")).toBe(50);
    expect(parsePriceEuros("12.")).toBe(1200);
  });

  it("refuses a value that is not a string at all", () => {
    // formData.get() returns a File for a file input, and null when absent.
    expect(parsePriceEuros(null)).toBeNull();
    expect(parsePriceEuros(undefined)).toBeNull();
    expect(parsePriceEuros(12.5)).toBeNull();
  });
});
