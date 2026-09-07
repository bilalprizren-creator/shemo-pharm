/**
 * Why a product shows no photo on the live site.
 *
 * The repo and the database can disagree about where a photo lives, and only
 * the database is read at runtime. `src/data/products.json` is a seed snapshot:
 * all 2 049 of its paths resolve to a file in public/products/, so a blank card
 * is never explained by anything in the repo. It is explained by a row.
 *
 * Three ways a row goes blank, and this tells them apart:
 *
 *   suspended blob   the bulk migration once pointed the catalog at Vercel Blob,
 *                    and that store is currently suspended. The host is still on
 *                    the allow list, so next/image happily requests a URL that
 *                    answers nothing and the card falls back to its placeholder.
 *                    localize-images.mjs --commit was the pass that repointed
 *                    these at /products/…; a row it missed still points at the
 *                    store.
 *   rejected host    a URL src/lib/images.ts does not allow. catalog.ts drops
 *                    those rather than letting next/image throw and take the
 *                    whole page down, which turns a bad URL into an empty card.
 *   missing file     a local path with no file behind it — a deploy that shipped
 *                    the row before the image.
 *
 * Read-only: SELECT only, no writes of any kind. Development database unless
 * DATABASE_TARGET=production says otherwise (see db/README.md).
 *
 *   node scripts/verify-images.mjs
 *   node scripts/verify-images.mjs --list          # every affected row
 *   DATABASE_TARGET=production node scripts/verify-images.mjs
 */
import { existsSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { connect, ROOT } from "./lib/db.mjs";

/**
 * The allow list from src/lib/images.ts, restated.
 *
 * A .mjs script cannot import that module — it is TypeScript, and its own
 * extensionless import of ./image-sniff does not resolve under node's type
 * stripping. Restating it would normally be exactly the drift that file exists
 * to prevent, so tests/verify-images.test.ts imports both and asserts they
 * agree on a table of URLs. If someone adds a host there and not here, that
 * test fails.
 */
const REMOTE_HOSTS = [
  { hostname: "*.public.blob.vercel-storage.com", pathname: "/" },
  { hostname: "shemopharm.com", pathname: "/wp-content/uploads/" },
];

function hostMatches(hostname, pattern) {
  if (!pattern.startsWith("*.")) return hostname === pattern;
  const suffix = pattern.slice(1);
  if (!hostname.endsWith(suffix)) return false;
  const label = hostname.slice(0, -suffix.length);
  return label.length > 0 && !label.includes(".");
}

/** Mirrors isAllowedImageSrc in src/lib/images.ts. */
export function allowed(src) {
  const value = typeof src === "string" ? src.trim() : "";
  if (!value) return false;
  if (value.startsWith("/")) return !value.startsWith("//");
  let url;
  try {
    url = new URL(value);
  } catch {
    return false;
  }
  return REMOTE_HOSTS.some(
    (p) =>
      url.protocol === "https:" &&
      hostMatches(url.hostname, p.hostname) &&
      url.pathname.startsWith(p.pathname)
  );
}

/** What kind of source this is, in the words the explanation above uses. */
export function classify(src, fileExists = (p) => existsSync(path.join(ROOT, "public", p))) {
  if (typeof src !== "string" || src.trim() === "") return "empty";
  if (!allowed(src)) return "rejected host";
  if (src.startsWith("/")) {
    return fileExists(src.replace(/^\//, "")) ? "local" : "missing file";
  }
  return new URL(src).hostname.endsWith(".public.blob.vercel-storage.com")
    ? "suspended blob"
    : "remote (wordpress)";
}

/** The source the site will actually use: override first, then the first allowed image. */
export function chosenSource(row) {
  const images = Array.isArray(row.images) ? row.images : [];
  return row.image_override ?? images.find(allowed) ?? null;
}

const OK = new Set(["local", "remote (wordpress)"]);

async function main() {
  const list = process.argv.includes("--list");
  const sql = connect();

  const rows = await sql`
    SELECT id, sku, name, images, image_override
    FROM products
    WHERE hidden = false
    ORDER BY id
  `;

  const counts = new Map();
  const blank = [];
  for (const row of rows) {
    const chosen = chosenSource(row);
    const verdict = classify(chosen);
    counts.set(verdict, (counts.get(verdict) ?? 0) + 1);
    if (!OK.has(verdict)) blank.push({ ...row, chosen, verdict });
  }

  console.log(`\n${rows.length} visible products\n`);
  for (const [verdict, n] of [...counts].sort((a, b) => b[1] - a[1])) {
    console.log(`  ${String(n).padStart(5)}  ${verdict}`);
  }

  if (blank.length === 0) {
    console.log("\nEvery product resolves to a photo that exists. Nothing to fix.");
    return;
  }

  console.log(`\n${blank.length} product(s) render the placeholder instead of a photo.`);
  const shown = list ? blank : blank.slice(0, 20);
  for (const row of shown) {
    console.log(
      `  ${row.verdict.padEnd(15)} ${String(row.id).padEnd(7)} ${row.sku || "—"}  ${row.name}\n` +
        `                  ${row.chosen ?? "(no image)"}`
    );
  }
  if (!list && blank.length > shown.length) {
    console.log(`  … and ${blank.length - shown.length} more (pass --list)`);
  }
  if (counts.get("suspended blob")) {
    console.log(
      "\nThe blob rows are the image migration's second pass never finishing:\n" +
        "  node scripts/localize-images.mjs --commit\n" +
        "repoints them at the copies already sitting in public/products/."
    );
  }
}

// Importable for the test above without opening a database connection.
if (import.meta.url === pathToFileURL(process.argv[1]).href) await main();
