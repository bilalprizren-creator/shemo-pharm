/**
 * Exports the full SHEMO PHARM catalog from the live WooCommerce Store API
 * into src/data/*.json. Re-run any time to refresh:  npm run export:catalog
 *
 * Source: https://shemopharm.com/wp-json/wc/store/v1/ (public, read-only)
 */
import { writeFile, mkdir } from "node:fs/promises";
import path from "node:path";

const API = "https://shemopharm.com/wp-json/wc/store/v1";
const OUT_DIR = path.join(import.meta.dirname, "..", "src", "data");
const PER_PAGE = 100;
const DELAY_MS = 350;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const NAMED_ENTITIES = { nbsp: " ", amp: "&", lt: "<", gt: ">", quot: '"', apos: "'" };

const stripHtml = (html) =>
  (html || "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, dec) => String.fromCodePoint(Number(dec)))
    .replace(/&([a-z]+);/gi, (m, name) => NAMED_ENTITIES[name.toLowerCase()] ?? m)
    .replace(/\s+/g, " ")
    .trim();

async function fetchJson(url) {
  const res = await fetch(url, { headers: { "User-Agent": "shemo-pharm-export/1.0" } });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText} for ${url}`);
  return { data: await res.json(), totalPages: Number(res.headers.get("x-wp-totalpages") || 1) };
}

async function exportCategories() {
  const { data } = await fetchJson(`${API}/products/categories?per_page=100&page=1`);
  return data.map((c) => ({
    id: c.id,
    name: stripHtml(c.name),
    slug: c.slug,
    parent: c.parent,
    count: c.count,
  }));
}

async function exportProducts() {
  const products = [];
  let page = 1;
  let totalPages = 1;
  do {
    const { data, totalPages: tp } = await fetchJson(
      `${API}/products?per_page=${PER_PAGE}&page=${page}&orderby=title&order=asc`
    );
    totalPages = tp;
    for (const p of data) {
      products.push({
        id: p.id,
        name: stripHtml(p.name),
        slug: p.slug,
        sku: p.sku || "",
        priceCents: Number(p.prices?.price ?? 0),
        regularCents: Number(p.prices?.regular_price ?? 0),
        onSale: p.on_sale === true,
        currency: p.prices?.currency_code || "EUR",
        images: (p.images || []).map((i) => i.src).filter(Boolean),
        categoryIds: (p.categories || []).map((c) => c.id),
        inStock: p.is_in_stock !== false,
        description: stripHtml(p.description),
        shortDescription: stripHtml(p.short_description),
      });
    }
    console.log(`products page ${page}/${totalPages} (${products.length} total)`);
    page += 1;
    await sleep(DELAY_MS);
  } while (page <= totalPages);
  return products;
}

const categories = await exportCategories();
console.log(`categories: ${categories.length}`);
const products = await exportProducts();

await mkdir(OUT_DIR, { recursive: true });
await writeFile(path.join(OUT_DIR, "categories.json"), JSON.stringify(categories, null, 1));
await writeFile(path.join(OUT_DIR, "products.json"), JSON.stringify(products, null, 1));
console.log(`Wrote ${products.length} products and ${categories.length} categories to src/data/`);
