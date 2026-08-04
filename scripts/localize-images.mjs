/**
 * Keep the product photos in the repo instead of in an object store.
 *
 * Regenerates every product photo from its original WordPress source into
 * public/products/ using the shared pipeline in scripts/lib/reframe.mjs, then
 * repoints the catalog at the local paths.
 *
 * Why local: nothing is uploaded at runtime yet — the admin form only accepts
 * image URLs, so a new product photo needs a developer either way and an object
 * store buys nothing that is actually used, while adding a service that can fail
 * independently of the site. It did: the Blob store was blocked hours after the
 * migration ("Your store is blocked"), which turned every product image on
 * production into a 502 because the database pointed at it. Files in the repo
 * cannot be blocked, are versioned with the code, and a revert brings them back.
 * When the admin panel grows a real upload — so new products appear without a
 * commit and deploy — Blob becomes the right answer again, and the manifest
 * still holds every URL to make that switch cheap.
 *
 * It regenerates rather than copying from Blob on purpose: the store is
 * unreachable, and the WordPress originals still answer 200. Same pipeline, so
 * the output is byte-identical to what the migration produced.
 *
 * TWO PASSES, and the order matters: the files must be in the DEPLOYED build
 * before the database points at them, or every product 404s. Pass 1 only writes
 * files, which then get committed and deployed; pass 2 repoints the catalog.
 *
 *   node scripts/localize-images.mjs            # pass 1, write public/products/
 *   node scripts/localize-images.mjs --commit   # pass 2, repoint DB + JSON
 *
 * Pass 1 is resumable: photos already on disk are skipped.
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { reframe } from "./lib/reframe.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const MANIFEST = path.join(ROOT, "scripts/.image-manifest.json");
const OUT_DIR = path.join(ROOT, "public/products");
const COMMIT = process.argv.includes("--commit");
const CONCURRENCY = 6;

function loadEnv(file) {
  if (!existsSync(file)) return;
  for (const line of readFileSync(file, "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
    if (!m) continue;
    let [, key, val] = m;
    val = val.trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    if (!(key in process.env)) process.env[key] = val;
  }
}
loadEnv(path.join(ROOT, ".env.local"));
loadEnv(path.join(ROOT, ".env"));

if (!existsSync(MANIFEST)) {
  console.error("ABORT: scripts/.image-manifest.json missing — nothing to localize.");
  process.exit(1);
}
const manifest = JSON.parse(readFileSync(MANIFEST, "utf8"));
const products = JSON.parse(readFileSync(path.join(ROOT, "src/data/products.json"), "utf8"));
const byId = new Map(manifest.entries.map((e) => [e.id, e]));

/** Same filename the migration chose, now under public/ instead of the store. */
const fileName = (entry) => entry.url.split("/").pop();
const localPath = (entry) => `/products/${fileName(entry)}`;

/* ---------------------------------------------------------------- PASS TWO */
if (COMMIT) {
  const missing = products.filter((p) => {
    const e = byId.get(p.id);
    return !e || !existsSync(path.join(OUT_DIR, fileName(e)));
  });
  if (missing.length) {
    console.error(`ABORT: ${missing.length} photo(s) not on disk — run pass 1 first. Nothing written.`);
    for (const p of missing.slice(0, 10)) console.error(`  ${p.id}  ${p.slug}`);
    process.exit(1);
  }

  for (const p of products) p.images = [localPath(byId.get(p.id))];
  writeFileSync(path.join(ROOT, "src/data/products.json"), JSON.stringify(products, null, 1));
  console.log(`Wrote src/data/products.json — ${products.length} products on local paths.`);

  if (!process.env.DATABASE_URL) {
    console.warn("DATABASE_URL missing — JSON written, database untouched.");
    process.exit(0);
  }
  const { neon } = await import("@neondatabase/serverless");
  const sql = neon(process.env.DATABASE_URL);
  for (const p of products) {
    await sql`UPDATE products SET images = ${JSON.stringify(p.images)}::jsonb WHERE id = ${p.id}`;
  }
  console.log(`Database updated: ${products.length} products served from public/products/.`);
  process.exit(0);
}

/* ---------------------------------------------------------------- PASS ONE */
mkdirSync(OUT_DIR, { recursive: true });

const queue = manifest.entries.filter((e) => !existsSync(path.join(OUT_DIR, fileName(e))));
console.log(
  `${manifest.entries.length} photos, ${manifest.entries.length - queue.length} already on disk, ${queue.length} to rebuild.\n`
);

const failures = [];
let done = 0;
let bytes = 0;
await Promise.all(
  Array.from({ length: CONCURRENCY }, async () => {
    while (queue.length) {
      const e = queue.shift();
      try {
        const res = await fetch(e.from, { headers: { "user-agent": "Mozilla/5.0" } });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const out = await reframe(Buffer.from(await res.arrayBuffer()));
        writeFileSync(path.join(OUT_DIR, fileName(e)), out.webp);
        bytes += out.webp.length;
      } catch (err) {
        failures.push({ slug: e.slug, error: err.message });
      }
      if (++done % 250 === 0) console.log(`  ${done}/${manifest.entries.length} …`);
    }
  })
);

console.log(
  `\nRebuilt ${done - failures.length} photos, ${failures.length} failed, ${(bytes / 1048576).toFixed(0)} MB in public/products/.`
);
if (failures.length) {
  for (const f of failures.slice(0, 20)) console.log(`  ${f.slug}: ${f.error}`);
  console.log("\nRe-run to retry — finished files are skipped.");
  process.exit(1);
}
console.log("\nCommit and deploy these files, THEN run with --commit to repoint the catalog.");
