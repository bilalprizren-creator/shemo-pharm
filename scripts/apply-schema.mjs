/**
 * Replays db/schema.sql into the target database.
 *
 *   node scripts/apply-schema.mjs                 # the development database
 *   DATABASE_TARGET=production node scripts/apply-schema.mjs
 *
 * Every statement in that file is CREATE ... IF NOT EXISTS or an ALTER that adds a
 * constraint, so running it against a database that already has the schema is a
 * no-op — it creates nothing and drops nothing. It never touches rows.
 *
 * The one exception is the ALTER TABLE ... ADD CONSTRAINT lines for foreign keys,
 * which Postgres has no IF NOT EXISTS form for. Those are attempted and their
 * "already exists" error is swallowed; any other error stops the run.
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { ROOT, connect, describeTarget, target } from "./lib/db.mjs";

const sql = connect();
const file = path.join(ROOT, "db", "schema.sql");
const source = readFileSync(file, "utf8");

/** Splits on semicolons at end of line, which is how the generator writes them. */
function statements(text) {
  return text
    .split(/;\s*(?:\r?\n|$)/)
    .map((s) =>
      s
        .split(/\r?\n/)
        .filter((line) => !/^\s*--/.test(line))
        .join("\n")
        .trim()
    )
    .filter(Boolean);
}

const all = statements(source);
console.log(`applying ${all.length} statements from db/schema.sql to ${describeTarget()}`);

let created = 0;
let alreadyThere = 0;

for (const statement of all) {
  const label = statement.split(/\r?\n/)[0].slice(0, 70);
  try {
    await sql.query(statement);
    created += 1;
  } catch (err) {
    const message = String(err?.message ?? err);
    // 42710 duplicate_object / 42P07 duplicate_table — the ADD CONSTRAINT lines.
    if (/already exists/i.test(message)) {
      alreadyThere += 1;
      continue;
    }
    console.error(`\nfailed on: ${label}\n${message}`);
    process.exitCode = 1;
    break;
  }
}

console.log(`${created} statements ran, ${alreadyThere} were already in place`);
if (target() === "development") {
  console.log("next: npm run seed:db to load the catalogue from src/data/*.json");
}
