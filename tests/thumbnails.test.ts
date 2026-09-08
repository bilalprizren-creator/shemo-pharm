import { readdirSync, existsSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { printImageFor, thumbnailFor } from "@/lib/images";

/**
 * The product grid draws thumbnailFor(src) and the print sheet draws
 * printImageFor(src), and both do arithmetic on the path rather than consulting
 * a list — neither can know whether the file it names exists. That is the cheap
 * and stale-proof way round, but it trades the lookup for a promise: every
 * photograph under public/products/ has a small copy in public/products/thumb/
 * and a print copy in public/products/print/.
 *
 * These tests are where the promise is kept. A photograph added without running
 * `npm run images:thumbs` renders as a broken image on every listing page, on
 * both sites, with nothing in any log to say so — the kind of fault that is
 * found by a customer rather than by us. On the print sheet it is worse: a
 * missing file prints as blank space on a sheet that goes into a partner's
 * drawer for a year. It fails here instead.
 */

const PRODUCTS = path.join(process.cwd(), "public", "products");

const sources = readdirSync(PRODUCTS, { withFileTypes: true })
  .filter((e) => e.isFile() && /\.(webp|png|jpe?g)$/i.test(e.name))
  .map((e) => e.name);

/** The two derived directories, and the function that names each one. */
const VARIANTS = [
  { name: "thumb", dir: "thumb", of: thumbnailFor },
  { name: "print", dir: "print", of: printImageFor },
] as const;

describe.each(VARIANTS)("$name paths", ({ dir, of }) => {
  it("points a local product photo at its copy", () => {
    expect(of("/products/1049-abox.webp")).toBe(`/products/${dir}/1049-abox.webp`);
  });

  it("normalises the extension, because the script always writes webp", () => {
    expect(of("/products/x.png")).toBe(`/products/${dir}/x.webp`);
    expect(of("/products/x.JPG")).toBe(`/products/${dir}/x.webp`);
  });

  it("leaves a copy alone rather than nesting another folder", () => {
    expect(of(`/products/${dir}/x.webp`)).toBe(`/products/${dir}/x.webp`);
  });

  it("leaves anything that is not a local product photo untouched", () => {
    for (const src of [
      "https://abc.public.blob.vercel-storage.com/products/x.webp",
      "/photos/shelf.webp",
      "/placeholder.svg",
      "",
    ]) {
      expect(of(src)).toBe(src);
    }
  });
});

describe("the two variants are different files", () => {
  it("does not let one function answer for the other", () => {
    // Guards against a copy-paste that leaves printImageFor pointing at
    // /products/thumb/ — which would type-check, render, and quietly put 560px
    // transparent images back into every generated PDF.
    expect(printImageFor("/products/x.webp")).not.toBe(thumbnailFor("/products/x.webp"));
  });
});

describe("every product photo has its copies", () => {
  it("finds sources to check at all", () => {
    // Guards the guard: an empty directory would make the next tests vacuous.
    expect(sources.length).toBeGreaterThan(1000);
  });

  // These stat or list several thousand files while twenty-two other test files
  // run beside them, which on a loaded machine ran past the default five
  // seconds every few runs — a suite that fails at random teaches people to
  // re-run it rather than read it.
  describe.each(VARIANTS)("$name", ({ dir, of }) => {
    it("has one copy per source, with nothing missing", { timeout: 20_000 }, () => {
      const missing = sources.filter((name) => {
        const copy = of(`/products/${name}`).replace("/products/", "");
        return !existsSync(path.join(PRODUCTS, copy));
      });
      expect(missing.slice(0, 10)).toEqual([]);
      expect(missing).toHaveLength(0);
    });

    it("has no copy whose source has gone", { timeout: 20_000 }, () => {
      // The other direction: a deleted photograph leaves a copy nothing points
      // at, which is dead weight in the repository and in the deploy.
      //
      // Through a Set rather than sources.some(): 4 574 copies against 4 574
      // sources is twenty-one million string comparisons, each one re-deriving
      // the same stem, which under a full parallel run was slow enough to trip
      // the five-second timeout every few runs.
      const stems = new Set(sources.map((s) => s.replace(/\.[^.]+$/, "")));
      const orphans = readdirSync(path.join(PRODUCTS, dir), { withFileTypes: true })
        .filter((e) => e.isFile())
        .map((e) => e.name)
        .filter((name) => !stems.has(name.replace(/\.webp$/i, "")));
      expect(orphans.slice(0, 10)).toEqual([]);
    });
  });
});
