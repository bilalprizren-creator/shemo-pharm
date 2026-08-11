/**
 * Migration: shared rate-limit counters.
 *
 *   node scripts/add-rate-limits-table.mjs
 *
 * Safe to re-run (IF NOT EXISTS throughout). Reads DATABASE_URL from .env.local
 * like the other scripts do — which on this project is the production database.
 */
import { connect } from "./lib/db.mjs";

const sql = connect();

// One row per (bucket, subject, window). `subject` is a keyed hash of the
// caller's IP, never the address itself, so this table holds no personal data —
// see subjectFor() in src/lib/rate-limit.ts.
//
// Why it exists: the limiter used to count in one instance's process memory, so
// on Vercel the real ceiling was `limit` multiplied by however many instances
// were warm. Harmless for the search endpoint, useless as a brute-force bound on
// the admin login.
await sql`
  CREATE TABLE IF NOT EXISTS rate_limits (
    bucket       TEXT        NOT NULL,
    subject      TEXT        NOT NULL,
    window_start TIMESTAMPTZ NOT NULL,
    count        INT         NOT NULL DEFAULT 0,
    PRIMARY KEY (bucket, subject, window_start)
  )
`;

// The primary key serves every read the limiter makes; this one is only for the
// occasional prune of expired windows, which would otherwise scan the table.
await sql`
  CREATE INDEX IF NOT EXISTS rate_limits_window_start_idx
  ON rate_limits (window_start)
`;

const [counts] = await sql`SELECT count(*)::int AS rows FROM rate_limits`;
console.log(`rate_limits: ready, ${counts.rows} rows`);
