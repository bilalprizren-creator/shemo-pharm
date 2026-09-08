import { readdirSync, existsSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { thumbnailFor } from "@/lib/images";

/**
 * The product grid draws thumbnailFor(src), and that function does arithmetic
 * on the path rather than consulting a list — it cannot know whether the file
 * it names exists. That is the cheap and stale-proof way round, but it trades
 * the lookup for a promise: every photograph under public/products/ has a small
 * copy beside it in public/products/thumb/.
 *
 * These tests are where the promise is kept. A photograph added without running
 * `npm run images:thumbs` renders as a broken image on every listing page, on
 * both sites, with nothing in any log to say so — the kind of fault that is
 * found by a customer rather than by us. It fails here instead.
 */

const PRODUCTS = path.join(process.cwd(), "public", "products");
const THUMBS = path.join(PRODUCTS, "thumb");

const sources = readdirSync(PRODUCTS, { withFileTypes: true })
  .filter((e) => e.isFile() && /\.(webp|png|jpe?g)$/i.test(e.name))
  .map((e) => e.name);

describe("thumbnailFor", () => {
  it("points a local product photo at its small copy", () => {
    expect(thumbnailFor("/products/1049-abox.webp")).toBe(
      "/products/thumb/1049-abox.webp"
    );
  });

  it("normalises the extension, because the script always writes webp", () => {
    expect(thumbnailFor("/products/x.png")).toBe("/products/thumb/x.webp");
    expect(thumbnailFor("/products/x.JPG")).toBe("/products/thumb/x.webp");
  });

  it("leaves a thumbnail alone rather than nesting another folder", () => {
    expect(thumbnailFor("/products/thumb/x.webp")).toBe("/products/thumb/x.webp");
  });

  it("leaves anything that is not a local product photo untouched", () => {
    for (const src of [
      "https://abc.public.blob.vercel-storage.com/products/x.webp",
      "/photos/shelf.webp",
      "/placeholder.svg",
      "",
    ]) {
      expect(thumbnailFor(src)).toBe(src);
    }
  });
});

describe("every product photo has a thumbnail", () => {
  it("finds sources to check at all", () => {
    // Guards the guard: an empty directory would make the next test vacuous.
    expect(sources.length).toBeGreaterThan(1000);
  });

  it("has one small copy per source, with nothing missing", () => {
    const missing = sources.filter((name) => {
      const thumb = thumbnailFor(`/products/${name}`).replace("/products/", "");
      return !existsSync(path.join(PRODUCTS, thumb));
    });
    expect(missing.slice(0, 10)).toEqual([]);
    expect(missing).toHaveLength(0);
  });

  it("has no thumbnail whose source has gone", () => {
    // The other direction: a deleted photograph leaves a small copy nothing
    // points at, which is dead weight in the repository and in the deploy.
    const orphans = readdirSync(THUMBS, { withFileTypes: true })
      .filter((e) => e.isFile())
      .map((e) => e.name)
      .filter((name) => {
        const stem = name.replace(/\.webp$/i, "");
        return !sources.some((s) => s.replace(/\.[^.]+$/, "") === stem);
      });
    expect(orphans.slice(0, 10)).toEqual([]);
  });
});
