import { describe, expect, it } from "vitest";
import { formatCount, roundDownCount } from "@/lib/format";

describe("roundDownCount", () => {
  it.each([
    [2285, 2200],
    [2279, 2200],
    [3000, 3000],
    [999, 990],
    [64, 64],
  ])("%i → %i", (n, expected) => {
    expect(roundDownCount(n)).toBe(expected);
  });

  it("never rounds up, so a figure beside a “+” stays true", () => {
    for (const n of [1, 99, 101, 1999, 2285, 12345]) expect(roundDownCount(n)).toBeLessThanOrEqual(n);
  });
});

describe("formatCount", () => {
  it("writes Albanian four-digit counts ungrouped, as CLDR does", () => {
    expect(formatCount(2285, "sq")).toBe("2285");
  });

  it("groups English thousands with a comma", () => {
    expect(formatCount(2285, "en")).toBe("2,285");
  });
});
