/**
 * Repoint products whose photo file is not where the database says it is.
 *
 *   node scripts/repair-image-paths.mjs           # dry run, writes a report
 *   node scripts/repair-image-paths.mjs --write   # applies it
 *   DATABASE_TARGET=production node scripts/repair-image-paths.mjs --write
 *
 * 24 products reference a file that does not exist in public/products/, so they
 * render as alt text ("Fix ear baby A6 (9408)") on both sites. Exactly 24 files
 * sit there that no product references. The two sets match one for one — the
 * original import wrote the row and the file with different trailing codes, and
 * for four of them a price leaked into the filename where the code should be:
 *
 *   1-60-hello-kitty-brushe-kids-a2-7657.webp
 *   4-40-sona-adapalen-gel-1mg-30g-7694.webp
 *   8-70-water-for-injections-ph-eur-50x10ml-amp-5295.webp
 *   16-00-mobilizues-per-nyje-te-kembes-me-jastek-ajri-8709.webp
 *
 * So neither the leading nor the trailing number is trustworthy on its own.
 * Matching is on the slug body first, then on the trailing code, and a file that
 * two products could claim is left alone rather than guessed at.
 *
 * After this, run `node scripts/cutout-images.mjs --write` so the repaired 24
 * get a transparent background like the other 1 990.
 */
import { readFileSync, writeFileSync, readdirSync, existsSync, mkdirSync } from "node:fs";
import path from "node:path";
import { connect, describeTarget, ROOT, dataPath } from "./lib/db.mjs";

const argv = process.argv.slice(2);
const WRITE = argv.includes("--write");
const DIR = path.join(ROOT, "public/products");

/**
 * The descriptive middle of a filename: no leading code, no trailing code, no
 * extension. "9408-fix-ear-baby-a6-6034.webp" and "9408-fix-ear-baby-a6-9408.webp"
 * both reduce to "fix-ear-baby-a6", which is what makes them the same photo.
 */
export function slugBody(filename) {
  return filename
    .replace(/\.[a-z0-9]+$/i, "")
    .replace(/^[0-9]+(?:[.,-][0-9]+)?[A-Za-z]?-/, "")
    .replace(/-[0-9]+[A-Za-z]?$/, "");
}

/** The code a filename ends with, which survives even a mangled prefix. */
export function trailingCode(filename) {
  return /-([0-9]{3,5}[A-Za-z]?)\.[a-z0-9]+$/i.exec(filename)?.[1] ?? null;
}

const sql = connect();
console.log(`target: ${describeTarget()}`);

const products = await sql`SELECT id, sku, name, images FROM products ORDER BY id`;

const referenced = new Set();
for (const p of products) {
  for (const src of Array.isArray(p.images) ? p.images : []) {
    referenced.add(path.basename(src));
  }
}

const broken = [];
for (const p of products) {
  const src = Array.isArray(p.images) ? p.images[0] : null;
  if (!src) {
    broken.push({ ...p, src: null });
    continue;
  }
  if (!existsSync(path.join(ROOT, "public", src))) broken.push({ ...p, src });
}

// Only files nothing points at are candidates. A file already in use belongs to
// the product using it, whatever its name suggests.
const orphans = readdirSync(DIR).filter((f) => !referenced.has(f));

console.log(`products with a missing photo: ${broken.length}`);
console.log(`files nothing references:      ${orphans.length}`);

/* --------------------------------------------------------------- matching */

const claims = new Map(); // orphan file -> [product, …] that could claim it
for (const p of broken) {
  const want = p.src ? path.basename(p.src) : null;
  for (const file of orphans) {
    const byBody = want && slugBody(file) === slugBody(want);
    const byCode = p.sku && trailingCode(file) === p.sku.trim();
    if (!byBody && !byCode) continue;
    const list = claims.get(file) ?? [];
    list.push({ product: p, how: byBody ? "slug body" : "trailing code" });
    claims.set(file, list);
  }
}

const repairs = [];
const contested = [];
const unmatched = [];
const takenBy = new Map(); // product id -> file, so no product takes two

for (const [file, list] of claims) {
  if (list.length > 1) {
    contested.push({ file, products: list.map((l) => l.product) });
    continue;
  }
  const { product, how } = list[0];
  if (takenBy.has(product.id)) {
    contested.push({ file, products: [product] });
    continue;
  }
  takenBy.set(product.id, file);
  repairs.push({
    id: product.id,
    sku: product.sku,
    name: product.name,
    from: product.src,
    to: `/products/${file}`,
    how,
  });
}

for (const p of broken) {
  if (!takenBy.has(p.id)) unmatched.push(p);
}

console.log(`\nmatched   ${repairs.length}`);
console.log(`contested ${contested.length}`);
console.log(`unmatched ${unmatched.length}`);

/* ----------------------------------------------------------------- report */

const report = [
  `# Image path repair — ${new Date().toISOString().slice(0, 10)}`,
  ``,
  `Target: ${describeTarget()}`,
  `Mode:   ${WRITE ? "WRITE" : "dry run"}`,
  ``,
  `| | |`,
  `|---|---|`,
  `| Products with a missing photo | ${broken.length} |`,
  `| Files nothing referenced | ${orphans.length} |`,
  `| Repointed | ${repairs.length} |`,
  `| Contested — left alone | ${contested.length} |`,
  `| Still without a photo | ${unmatched.length} |`,
  ``,
  `## Repointed (${repairs.length})`,
  ``,
  ...(repairs.length
    ? [
        `| Code | Product | Was | Now | Matched on |`,
        `|---|---|---|---|---|`,
        ...repairs.map(
          (r) => `| ${r.sku} | ${r.name} | ${r.from ?? "—"} | ${r.to} | ${r.how} |`
        ),
      ]
    : [`None.`]),
  ``,
  `## Contested (${contested.length})`,
  ``,
  `More than one product could claim the same file, so it was left alone rather`,
  `than guessed at. Assign these by hand in /admin.`,
  ``,
  ...(contested.length
    ? contested.map((c) => `- ${c.file} — claimed by ${c.products.map((p) => p.sku).join(", ")}`)
    : [`None.`]),
  ``,
  `## Still without a photo (${unmatched.length})`,
  ``,
  ...(unmatched.length
    ? unmatched.map((p) => `- ${p.sku} — ${p.name} (${p.src ?? "no image set"})`)
    : [`None.`]),
  ``,
].join("\n");

mkdirSync(path.join(ROOT, "audit"), { recursive: true });
writeFileSync(path.join(ROOT, "audit", "image-path-repair.md"), report);
console.log(`report    audit/image-path-repair.md`);

if (!WRITE) {
  console.log(`\n(dry run — pass --write to apply)`);
  process.exit(0);
}

if (!repairs.length) {
  console.log(`\nnothing to write`);
  process.exit(0);
}

/* ------------------------------------------------------------------ write */

await sql`
  UPDATE products AS p
  SET images = v.img::jsonb, updated_at = now()
  FROM (
    SELECT unnest(${repairs.map((r) => r.id)}::int[]) AS id,
           unnest(${repairs.map((r) => JSON.stringify([r.to]))}::text[]) AS img
  ) AS v
  WHERE p.id = v.id
`;

// products.json is what `npm run seed:db` replays; leaving it behind would mean
// the next re-seed quietly restores every broken path.
const file = dataPath("products.json");
const seed = JSON.parse(readFileSync(file, "utf8"));
const byId = new Map(repairs.map((r) => [r.id, r.to]));
let touched = 0;
for (const p of seed) {
  const next = byId.get(p.id);
  if (!next) continue;
  p.images = [next];
  touched++;
}
writeFileSync(file, JSON.stringify(seed, null, 1));

const after = await sql`SELECT images FROM products`;
const stillBroken = after.filter((r) => {
  const src = Array.isArray(r.images) ? r.images[0] : null;
  return !src || !existsSync(path.join(ROOT, "public", src));
}).length;

console.log(`\nrepointed ${repairs.length} products, ${touched} entries in products.json`);
console.log(`products still pointing at a missing file: ${stillBroken}`);
console.log(`\nNext: node scripts/cutout-images.mjs --write`);
