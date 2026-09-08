/**
 * Migration: indexes for the two admin inboxes.
 *
 *   node scripts/add-inbox-indexes.mjs                (development)
 *   DATABASE_TARGET=production node scripts/…         (production)
 *
 * Safe to re-run.
 *
 * contact_messages and orders each carry nothing but a primary key, and both
 * are read the same way on every load of /admin/mesazhet and /admin/porosite:
 *
 *     ORDER BY created_at DESC LIMIT 40 OFFSET n
 *
 * which without an index is a full scan and a sort of the whole table for a
 * page of forty. It did not matter while the pages capped themselves at 200
 * rows and never paged past that; now that they page properly, it will.
 *
 * DESC in the index definition matters: Postgres can walk an ASC index
 * backwards, but a DESC index makes the plan a plain forward scan, and these
 * tables are only ever read newest-first.
 */
import { connect, describeTarget } from "./lib/db.mjs";

const sql = connect();

console.log(`adding inbox indexes to ${describeTarget()}`);

await sql`
  CREATE INDEX IF NOT EXISTS contact_messages_created_at_idx
  ON contact_messages (created_at DESC)
`;

await sql`
  CREATE INDEX IF NOT EXISTS orders_created_at_idx
  ON orders (created_at DESC)
`;

/**
 * The unread and still-open filters, which are the way both pages are actually
 * read. Partial, because "read" and "handled" are the states rows spend most of
 * their life in — indexing those would be indexing nearly the whole table to
 * find the few rows that are not in it.
 */
await sql`
  CREATE INDEX IF NOT EXISTS contact_messages_unread_idx
  ON contact_messages (created_at DESC) WHERE is_read = false
`;

await sql`
  CREATE INDEX IF NOT EXISTS orders_open_idx
  ON orders (created_at DESC) WHERE is_handled = false
`;

for (const table of ["contact_messages", "orders"]) {
  const rows = await sql.query(
    `SELECT indexname FROM pg_indexes WHERE tablename = $1 ORDER BY indexname`,
    [table]
  );
  console.log(`  ${table}: ${rows.map((r) => r.indexname).join(", ")}`);
}

console.log("\nRe-run `npm run db:schema:dump` and commit the diff.");
