import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
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


  /**
   * Every leaf key is reached from somewhere in src/.
   *
   * A dictionary key nothing renders is not harmless: `accountPage.ordersEmpty`
   * sat here fully translated while the account page rendered no order section
   * at all for a customer who had not ordered yet — the copy explaining the
   * empty state existed, and the empty state did not.
   *
   * The check is deliberately loose. Keys are read as `dict.a.b.c`, through a
   * destructured `labels` prop, or built up in a `labels={{ … }}` object, so it
   * looks for the last segment as an identifier anywhere in the source rather
   * than for the full path. That cannot catch a key whose final segment happens
   * to match an unrelated variable — it is here to catch the dead ones, not to
   * prove liveness.
   */
  it("uses every key it defines somewhere in src/", () => {
    const root = fileURLToPath(new URL("../src", import.meta.url));
    const sources: string[] = [];
    const walk = (dir: string) => {
      for (const e of readdirSync(dir, { withFileTypes: true })) {
        const full = join(dir, e.name);
        if (e.isDirectory()) walk(full);
        else if (/\.(ts|tsx)$/.test(e.name) && !full.includes("dictionaries"))
          sources.push(readFileSync(full, "utf8"));
      }
    };
    walk(root);
    // Every identifier-shaped token in src/, so the lookup is a set membership
    // test rather than one regex per key — and needs no escaping.
    const seen = new Set(sources.join(" ").match(/[A-Za-z_$][\w$]*/g) ?? []);

    // Groups read by dynamic index rather than by name, so no source file ever
    // spells their keys out. CategoryGrid.tsx:46 looks categoryCards up by the
    // category's own slug; a key here is dead only if the category is gone,
    // which is a different check from this one.
    const dynamic = ["home.categoryCards."];

    const unused = [...SQ.keys()]
      .filter((path) => !dynamic.some((p) => path.startsWith(p)))
      .map((path) => path.replace(/\[\d+\]$/, ""))
      .map((path) => path.split(".").at(-1)!)
      .filter((leaf, i, all) => all.indexOf(leaf) === i)
      .filter((leaf) => !seen.has(leaf));

    expect(unused).toEqual([]);
  });
  it("declares its own language", () => {
    expect(sq.lang).toBe("sq");
    expect(en.lang).toBe("en");
  });
});
