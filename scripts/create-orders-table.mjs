/**
 * One-time migration: the `orders` table backing the cart order log and the
 * /admin/porosite inbox. Safe to re-run (IF NOT EXISTS).
 *
 *   node scripts/create-orders-table.mjs
 *
 * Reads DATABASE_URL from .env.local like the seed script does.
 */
import { readFileSync, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { neon } from "@neondatabase/serverless";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function loadEnv(file) {
  if (!existsSync(file)) return;
  for (const line of readFileSync(file, "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
    if (m) process.env[m[1]] ??= (m[2] ?? "").replace(/^["']|["']$/g, "");
  }
}
loadEnv(path.join(ROOT, ".env.local"));

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL is not set (expected in .env.local).");
  process.exit(1);
}

const sql = neon(process.env.DATABASE_URL);

await sql`
  CREATE TABLE IF NOT EXISTS orders (
    id             SERIAL PRIMARY KEY,
    customer_name  TEXT NOT NULL DEFAULT '',
    customer_email TEXT NOT NULL DEFAULT '',
    channel        TEXT NOT NULL CHECK (channel IN ('whatsapp', 'email')),
    items          JSONB NOT NULL,
    items_count    INT NOT NULL,
    total_cents    INT NOT NULL DEFAULT 0,
    is_handled     BOOLEAN NOT NULL DEFAULT false,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
  )
`;

console.log("orders table ready");
