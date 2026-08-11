/**
 * One-time migration: the `orders` table backing the cart order log and the
 * /admin/porosite inbox. Safe to re-run (IF NOT EXISTS).
 *
 *   node scripts/create-orders-table.mjs
 *
 * Superseded by db/schema.sql, which now carries this table along with the other
 * six; kept because it is the record of when and why `orders` appeared. Uses the
 * shared connect() so it obeys DATABASE_TARGET like everything else — it had its
 * own .env parser reading DATABASE_URL directly, which is how a "one-time
 * migration" ends up running against the live site.
 */
import { connect } from "./lib/db.mjs";

const sql = connect();

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
