/**
 * Proves that db/schema.sql actually rebuilds the database.
 *
 *   DATABASE_URL_VERIFY=<throwaway branch> node scripts/verify-schema.mjs
 *
 * A schema file nobody has replayed is a guess. This wipes a *throwaway* database
 * to bare earth, replays db/schema.sql into it, then compares its shape against
 * the reference database column by column, constraint by constraint, index by
 * index. Any difference is printed and the exit code is 1.
 *
 * Safety, because this script drops things:
 *
 *   - the target comes from DATABASE_URL_VERIFY and nowhere else. It never reads
 *     DATABASE_URL, so there is no configuration in which "forgot to set it"
 *     means "use the database I actually care about";
 *   - it refuses to run if that host is the same as the production or development
 *     host;
 *   - the reference it compares against is opened read-only in practice — it only
 *     ever runs SELECTs against it.
 *
 * Use a Neon branch with an expiry date. It is meant to be disposable.
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { neon } from "@neondatabase/serverless";
import { ROOT, loadEnv } from "./lib/db.mjs";

loadEnv();

const verifyUrl = process.env.DATABASE_URL_VERIFY;
if (!verifyUrl) {
  throw new Error(
    "DATABASE_URL_VERIFY is not set. Point it at a throwaway Neon branch — this " +
      "script drops every table in it."
  );
}

const referenceUrl = process.env.DATABASE_URL_PRODUCTION ?? process.env.DATABASE_URL;
if (!referenceUrl) throw new Error("no reference database configured");

const hostOf = (url) => new URL(url).hostname;
for (const [name, url] of [
  ["DATABASE_URL_PRODUCTION", process.env.DATABASE_URL_PRODUCTION],
  ["DATABASE_URL_DEVELOPMENT", process.env.DATABASE_URL_DEVELOPMENT],
  ["DATABASE_URL", process.env.DATABASE_URL],
]) {
  if (url && hostOf(url) === hostOf(verifyUrl)) {
    throw new Error(
      `refusing to wipe ${hostOf(verifyUrl)} — it is also ${name}. Use a throwaway branch.`
    );
  }
}

const verify = neon(verifyUrl);
const reference = neon(referenceUrl);

console.log(`reference : ${hostOf(referenceUrl)}`);
console.log(`throwaway : ${hostOf(verifyUrl)}  (about to be wiped)`);

/* ----------------------------- introspection ----------------------------- */

async function shapeOf(sql) {
  const columns = await sql`
    SELECT c.relname AS tbl, a.attname AS col,
           format_type(a.atttypid, a.atttypmod) AS type,
           a.attnotnull AS not_null,
           coalesce(pg_get_expr(d.adbin, d.adrelid), '') AS default_expr
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    JOIN pg_attribute a ON a.attrelid = c.oid
    LEFT JOIN pg_attrdef d ON d.adrelid = c.oid AND d.adnum = a.attnum
    WHERE n.nspname = 'public' AND c.relkind = 'r'
      AND a.attnum > 0 AND NOT a.attisdropped
    ORDER BY c.relname, a.attname
  `;
  const constraints = await sql`
    SELECT c.relname AS tbl, con.conname AS name, pg_get_constraintdef(con.oid) AS def
    FROM pg_constraint con
    JOIN pg_class c ON c.oid = con.conrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
    ORDER BY c.relname, con.conname
  `;
  const indexes = await sql`
    SELECT tablename AS tbl, indexname AS name, indexdef AS def
    FROM pg_indexes WHERE schemaname = 'public'
    ORDER BY tablename, indexname
  `;
  const sequences = await sql`
    SELECT s.relname AS name, format_type(q.seqtypid, NULL) AS type,
           q.seqincrement AS increment, q.seqstart AS start
    FROM pg_class s
    JOIN pg_namespace n ON n.oid = s.relnamespace
    JOIN pg_sequence q ON q.seqrelid = s.oid
    WHERE n.nspname = 'public' AND s.relkind = 'S'
    ORDER BY s.relname
  `;

  const set = new Map();
  for (const r of columns) {
    set.set(
      `column ${r.tbl}.${r.col}`,
      `${r.type} not_null=${r.not_null} default=${r.default_expr}`
    );
  }
  for (const r of constraints) set.set(`constraint ${r.tbl}.${r.name}`, r.def);
  for (const r of indexes) set.set(`index ${r.tbl}.${r.name}`, r.def);
  for (const r of sequences) {
    set.set(`sequence ${r.name}`, `${r.type} increment=${r.increment} start=${r.start}`);
  }
  return set;
}

/* ------------------------------- wipe + apply ---------------------------- */

// Bare earth. DROP SCHEMA takes the tables, sequences, indexes and constraints
// with it, so what follows is a genuine from-nothing rebuild rather than a
// no-op against a schema that was already there.
await verify.query("DROP SCHEMA public CASCADE");
await verify.query("CREATE SCHEMA public");
console.log("throwaway wiped to an empty public schema");

const source = readFileSync(path.join(ROOT, "db", "schema.sql"), "utf8");
const statements = source
  .split(/;\s*(?:\r?\n|$)/)
  .map((s) =>
    s
      .split(/\r?\n/)
      .filter((line) => !/^\s*--/.test(line))
      .join("\n")
      .trim()
  )
  .filter(Boolean);

for (const [i, statement] of statements.entries()) {
  try {
    await verify.query(statement);
  } catch (err) {
    console.error(
      `\nstatement ${i + 1} failed — db/schema.sql cannot rebuild an empty database:\n` +
        `${statement.split(/\r?\n/)[0]}\n${err?.message ?? err}`
    );
    process.exit(1);
  }
}
console.log(`replayed ${statements.length} statements from db/schema.sql`);

/* --------------------------------- compare ------------------------------- */

const want = await shapeOf(reference);
const got = await shapeOf(verify);

const problems = [];
for (const [key, value] of want) {
  if (!got.has(key)) problems.push(`missing:  ${key}`);
  else if (got.get(key) !== value) {
    problems.push(`differs:  ${key}\n            reference: ${value}\n            rebuilt:   ${got.get(key)}`);
  }
}
for (const key of got.keys()) {
  if (!want.has(key)) problems.push(`extra:    ${key}`);
}

console.log(`\ncompared ${want.size} objects against the reference database`);
if (problems.length === 0) {
  console.log("IDENTICAL — db/schema.sql rebuilds the database exactly.");
} else {
  console.error(`${problems.length} difference(s):\n`);
  for (const p of problems) console.error(`  ${p}`);
  process.exitCode = 1;
}
