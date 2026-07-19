/**
 * One-time / idempotent seed for the SHEMO PHARM backend database.
 *
 * Loads the catalog snapshot (src/data/*.json), the bundled overlay values
 * (image/name overrides, featured picks) and any existing file-based users,
 * and writes them into the Neon Postgres tables. Safe to re-run: every insert
 * upserts by primary key / unique key.
 *
 *   npm run seed:db
 *
 * Requires DATABASE_URL (and, for the admin account, ADMIN_EMAIL /
 * ADMIN_PASSWORD) — read from .env.local automatically.
 */
import { readFileSync, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { randomBytes, scryptSync } from "node:crypto";
import { neon } from "@neondatabase/serverless";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

// --- Minimal .env loader (no dependency; matches Next.js precedence enough) ---
function loadEnv(file) {
  if (!existsSync(file)) return;
  for (const line of readFileSync(file, "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
    if (!m) continue;
    let [, key, val] = m;
    val = val.trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    if (!(key in process.env)) process.env[key] = val;
  }
}
loadEnv(path.join(ROOT, ".env.local"));
loadEnv(path.join(ROOT, ".env"));

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL is not set (add it to .env.local).");
  process.exit(1);
}
const sql = neon(process.env.DATABASE_URL);

// --- Overlays copied from src/lib/catalog.ts (fold into DB columns) ---
const CATEGORY_DISPLAY_NAMES = {
  "paisje-medicinale": "Pajisje mjekësore",
  "suplements-effervescent": "Suplemente & Efervescente",
  "alkool-dhe-antiseptik": "Alkool dhe antiseptikë",
  "mbathje-ortopedike": "Mbathje ortopedike",
  "cajra-mjekesore": "Çajra mjekësore",
  "cajra-me-filter": "Çajra me filtër",
  prezervativ: "Prezervativë",
  "te-tjera": "Të tjera",
  "te-ndryshme": "Të ndryshme",
  "te-ndryshme-atc-natyral": "Të ndryshme",
  "te-ndryshme-prezervativ": "Të ndryshme",
  "te-ndryshme-suplements-effervescent": "Të ndryshme",
  "te-tjera-ersa-med-ortoped": "Të tjera",
};
const PRODUCT_DISPLAY_NAMES = {
  "0018": "Tensiometër digjital për krah – SHEMO SHM-500",
  "0002": "Pulseoksimetër – SHEMO SHM-300",
  "0012": "Nebulizator me kompresor – SHEMO SHM-100",
  "7159": "A-Z Vitamina + Lutein & Q10 – 60 tableta",
};
const LOCAL_IMAGES = {
  "0018": "/products/0018-tensiometer-shm-500.png",
  "0002": "/products/0002-pulseoximeter-shm-300.png",
  "0012": "/products/0012-compressor-nebulizer-shm-100.png",
  "0013": "/products/0013-mesh-nebulizer-shm-200.png",
  "7159": "/products/7159-az-vitamine.png",
  "3204": "/products/3204-calcium-vitamin-c.png",
  "7601": "/products/7601-gummy-monsters-multivitamin.png",
  "1007": "/products/1007-alpherol-vitamin-e.png",
};
// The four curated homepage picks become featured=true.
const FEATURED_SLUGS = new Set([
  "tensiometer-digjital-krahu-shemo-shm-500-0018",
  "pulseoximeter-shm-300-0002",
  "compressor-nebulizer-shm-100-0012",
  "a-z-vitamine-lutein-q10-60-tab-7159",
]);

function hashPassword(password) {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

function readJson(rel) {
  return JSON.parse(readFileSync(path.join(ROOT, rel), "utf8"));
}

function* chunk(arr, size) {
  for (let i = 0; i < arr.length; i += size) yield arr.slice(i, i + size);
}

async function main() {
  const products = readJson("src/data/products.json");
  const categories = readJson("src/data/categories.json");
  const categoryIds = new Set(categories.map((c) => c.id));

  // 1) Categories
  const categoryRows = categories.map((c) => ({
    id: c.id,
    name: c.name,
    slug: c.slug,
    parent: c.parent ?? 0,
    count: c.count ?? 0,
    display_name: CATEGORY_DISPLAY_NAMES[c.slug] ?? null,
  }));
  await sql`
    INSERT INTO categories (id, name, slug, parent, count, display_name)
    SELECT id, name, slug, parent, count, display_name
    FROM jsonb_to_recordset(${JSON.stringify(categoryRows)}::jsonb)
      AS t(id int, name text, slug text, parent int, count int, display_name text)
    ON CONFLICT (id) DO UPDATE SET
      name = EXCLUDED.name, slug = EXCLUDED.slug, parent = EXCLUDED.parent,
      count = EXCLUDED.count, display_name = EXCLUDED.display_name
  `;
  console.log(`categories: ${categoryRows.length}`);

  // 2) Products (chunked)
  const productRows = products.map((p) => ({
    id: p.id,
    name: p.name,
    slug: p.slug,
    sku: p.sku ?? "",
    price_cents: p.priceCents ?? 0,
    regular_cents: p.regularCents ?? 0,
    on_sale: Boolean(p.onSale),
    currency: p.currency ?? "EUR",
    images: p.images ?? [],
    in_stock: p.inStock !== false,
    description: p.description ?? "",
    short_description: p.shortDescription ?? "",
    display_name: PRODUCT_DISPLAY_NAMES[p.sku] ?? null,
    image_override: LOCAL_IMAGES[p.sku] ?? null,
    featured: FEATURED_SLUGS.has(p.slug),
  }));
  for (const batch of chunk(productRows, 500)) {
    await sql`
      INSERT INTO products (
        id, name, slug, sku, price_cents, regular_cents, on_sale, currency,
        images, in_stock, description, short_description, display_name,
        image_override, featured
      )
      SELECT id, name, slug, sku, price_cents, regular_cents, on_sale, currency,
             images, in_stock, description, short_description, display_name,
             image_override, featured
      FROM jsonb_to_recordset(${JSON.stringify(batch)}::jsonb) AS t(
        id int, name text, slug text, sku text, price_cents int,
        regular_cents int, on_sale boolean, currency text, images jsonb,
        in_stock boolean, description text, short_description text,
        display_name text, image_override text, featured boolean
      )
      ON CONFLICT (id) DO UPDATE SET
        name = EXCLUDED.name, slug = EXCLUDED.slug, sku = EXCLUDED.sku,
        price_cents = EXCLUDED.price_cents, regular_cents = EXCLUDED.regular_cents,
        on_sale = EXCLUDED.on_sale, currency = EXCLUDED.currency,
        images = EXCLUDED.images, in_stock = EXCLUDED.in_stock,
        description = EXCLUDED.description,
        short_description = EXCLUDED.short_description,
        display_name = EXCLUDED.display_name,
        image_override = EXCLUDED.image_override,
        featured = EXCLUDED.featured, updated_at = now()
    `;
  }
  console.log(`products: ${productRows.length}`);

  // 3) Product ↔ Category links (only for categories that exist)
  const linkRows = [];
  const seen = new Set();
  for (const p of products) {
    for (const cid of p.categoryIds ?? []) {
      if (!categoryIds.has(cid)) continue;
      const key = `${p.id}:${cid}`;
      if (seen.has(key)) continue;
      seen.add(key);
      linkRows.push({ product_id: p.id, category_id: cid });
    }
  }
  for (const batch of chunk(linkRows, 1000)) {
    await sql`
      INSERT INTO product_categories (product_id, category_id)
      SELECT product_id, category_id
      FROM jsonb_to_recordset(${JSON.stringify(batch)}::jsonb)
        AS t(product_id int, category_id int)
      ON CONFLICT DO NOTHING
    `;
  }
  console.log(`product_categories: ${linkRows.length}`);

  // 4) Users — migrate existing file store (keep their password hashes)
  const usersFile = path.join(ROOT, "data", "users.json");
  let existingUsers = [];
  if (existsSync(usersFile)) {
    try {
      existingUsers = JSON.parse(readFileSync(usersFile, "utf8"));
    } catch {
      existingUsers = [];
    }
  }
  const userRows = existingUsers
    .filter((u) => u.email && u.passwordHash)
    .map((u) => ({
      email: String(u.email).toLowerCase(),
      password_hash: u.passwordHash,
      name: u.name ?? "",
      company: u.company ?? "",
      phone: u.phone ?? "",
      status: u.status === "approved" ? "approved" : "pending",
      role: "customer",
    }));
  if (userRows.length) {
    await sql`
      INSERT INTO users (email, password_hash, name, company, phone, status, role)
      SELECT email, password_hash, name, company, phone, status, role
      FROM jsonb_to_recordset(${JSON.stringify(userRows)}::jsonb) AS t(
        email text, password_hash text, name text, company text,
        phone text, status text, role text
      )
      ON CONFLICT (email) DO NOTHING
    `;
  }
  console.log(`users migrated: ${userRows.length}`);

  // Ensure the demo account exists (approved) so price gating can be tested.
  await sql`
    INSERT INTO users (email, password_hash, name, company, phone, status, role)
    VALUES ('demo@shemopharm.com', ${hashPassword("Demo2026!")},
            'Llogari Demo', 'Barnatore Demo', '', 'approved', 'customer')
    ON CONFLICT (email) DO NOTHING
  `;

  // 5) Admin bootstrap
  const adminEmail = (process.env.ADMIN_EMAIL ?? "").toLowerCase().trim();
  const adminPassword = process.env.ADMIN_PASSWORD ?? "";
  if (adminEmail && adminPassword) {
    await sql`
      INSERT INTO users (email, password_hash, name, company, phone, status, role)
      VALUES (${adminEmail}, ${hashPassword(adminPassword)},
              'Administrator', 'SHEMO PHARM', '', 'approved', 'admin')
      ON CONFLICT (email) DO UPDATE SET
        password_hash = EXCLUDED.password_hash, role = 'admin', status = 'approved'
    `;
    console.log(`admin ensured: ${adminEmail}`);
  } else {
    console.warn("ADMIN_EMAIL / ADMIN_PASSWORD not set — skipped admin bootstrap.");
  }

  const [{ count: pc }] = await sql`SELECT count(*)::int AS count FROM products`;
  const [{ count: uc }] = await sql`SELECT count(*)::int AS count FROM users`;
  console.log(`\nDone. products=${pc}, users=${uc}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
