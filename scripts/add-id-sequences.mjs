/**
 * Migration: real sequences for products.id and categories.id.
 *
 *   node scripts/add-id-sequences.mjs                 (development)
 *   DATABASE_TARGET=production node scripts/…         (production)
 *
 * Safe to re-run. Which database it talks to is decided by scripts/lib/db.mjs —
 * development unless DATABASE_TARGET says production.
 *
 * Why it exists: both tables were seeded from WooCommerce with their ids
 * preserved and so never got a sequence, and the admin insert compensated with
 *
 *     (SELECT COALESCE(MAX(id), 0) + 1 FROM products)
 *
 * which is a read-modify-write with no lock. Two editors saving a new product
 * in the same instant pick the same id; one of them gets a primary-key
 * violation, which surfaces as an unhandled 500 in the admin form rather than
 * as a message. Rare — and rare is exactly why it would be filed under "the
 * panel is flaky" instead of being found.
 *
 * setval's third argument `false` means "the next value is this one", so the
 * first insert after this migration takes MAX(id) + 1: the same number the old
 * expression would have produced. db/README.md prescribes this same setval for
 * the tables that already have sequences.
 */
import { connect, describeTarget } from "./lib/db.mjs";

const sql = connect();

console.log(`adding id sequences to ${describeTarget()}`);

for (const table of ["products", "categories"]) {
  const seq = `${table}_id_seq`;

  await sql.query(`CREATE SEQUENCE IF NOT EXISTS ${seq} AS integer`);
  // OWNED BY, so dropping the table takes the sequence with it — the shape
  // dump-schema.mjs already emits for the four tables that have one.
  await sql.query(`ALTER SEQUENCE ${seq} OWNED BY ${table}.id`);
  await sql.query(
    `ALTER TABLE ${table} ALTER COLUMN id SET DEFAULT nextval('${seq}'::regclass)`
  );
  await sql.query(
    `SELECT setval('${seq}', (SELECT COALESCE(MAX(id), 0) + 1 FROM ${table}), false)`
  );

  const [row] = await sql.query(
    `SELECT (SELECT last_value FROM ${seq})::int AS next,
            (SELECT COALESCE(MAX(id), 0) FROM ${table})::int AS max_id`
  );
  console.log(`  ${table}: max id ${row.max_id}, next id ${row.next}`);
}

console.log("\nRe-run `npm run db:schema:dump` and commit the diff.");
