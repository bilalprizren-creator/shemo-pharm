/**
 * Migration: server-side session revocation.
 *
 *   node scripts/add-session-revocation.mjs
 *
 * Safe to re-run (ADD COLUMN IF NOT EXISTS). Reads DATABASE_URL from .env.local
 * like the other scripts do — which on this project is the production database,
 * so read that file before running anything here.
 */
import { connect } from "./lib/db.mjs";

const sql = connect();

// Sessions issued before this instant are refused. NULL means nothing has been
// revoked for the account, which is the right starting point for everyone.
//
// The session is a signed JWT and there is no session table, so before this
// column existed a logout could only delete the browser's copy of the cookie —
// any other copy kept working until it expired on its own, up to seven days
// later, and a password change left every open session running. Compared against
// the token's `iat` claim in src/lib/session-cookie.ts, so no cookie needs
// reissuing and nobody is logged out by the migration itself.
await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS sessions_valid_from TIMESTAMPTZ`;

const [counts] = await sql`
  SELECT count(*)::int AS total,
         count(sessions_valid_from)::int AS revoked
  FROM users
`;
console.log(
  `users: ${counts.total} total, ${counts.revoked} with a revocation recorded`
);
