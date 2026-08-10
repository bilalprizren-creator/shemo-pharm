import { describe, expect, it } from "vitest";
import { sq } from "@/dictionaries/sq";
import { en } from "@/dictionaries/en";

/**
 * TypeScript already forces en.ts to have sq.ts's shape — `en: Dictionary` is
 * the whole enforcement mechanism, and it is a good one. What it cannot see is
 * what is *inside* the strings: an empty translation, or a placeholder that was
 * dropped while translating, both typecheck perfectly and both render as
 * nonsense. fmt() leaves an unmatched {placeholder} on screen, so a missing one
 * shows a customer a literal "{n}".
 */

type Node = string | number | boolean | readonly Node[] | { [key: string]: Node };

/** Every leaf string in a dictionary, keyed by its dotted path. */
function flatten(node: Node, prefix = ""): Map<string, string> {
  const out = new Map<string, string>();
  if (typeof node === "string") {
    out.set(prefix, node);
    return out;
  }
  if (Array.isArray(node)) {
    node.forEach((child, i) => {
      for (const [k, v] of flatten(child, `${prefix}[${i}]`)) out.set(k, v);
    });
    return out;
  }
  if (node && typeof node === "object") {
    for (const [key, child] of Object.entries(node)) {
      const path = prefix ? `${prefix}.${key}` : key;
      for (const [k, v] of flatten(child as Node, path)) out.set(k, v);
    }
  }
  return out;
}

const placeholders = (value: string): string[] =>
  [...value.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();

const SQ = flatten(sq as unknown as Node);
const EN = flatten(en as unknown as Node);

describe("dictionaries", () => {
  it("has strings to compare at all", () => {
    expect(SQ.size).toBeGreaterThan(200);
  });

  it("carries no empty or whitespace-only string in either language", () => {
    const blank = [...SQ, ...EN].filter(([, v]) => v.trim() === "").map(([k]) => k);
    expect(blank).toEqual([]);
  });

  it("keeps the same list of leaf strings in both languages", () => {
    // Guards the case TypeScript misses: an array that lost or gained an entry.
    expect([...EN.keys()].sort()).toEqual([...SQ.keys()].sort());
  });

  it("keeps every {placeholder} through the translation", () => {
    const mismatched: string[] = [];
    for (const [key, albanian] of SQ) {
      const english = EN.get(key);
      if (english === undefined) continue;
      const a = placeholders(albanian);
      const e = placeholders(english);
      if (a.join(",") !== e.join(",")) {
        mismatched.push(`${key}: sq {${a}} vs en {${e}}`);
      }
    }
    expect(mismatched).toEqual([]);
  });

  it("declares its own language", () => {
    expect(sq.lang).toBe("sq");
    expect(en.lang).toBe("en");
  });
});
