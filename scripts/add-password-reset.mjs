/**
 * Migration: the per-address send guard for password reset links.
 *
 *   node scripts/add-password-reset.mjs
 *
 * Safe to re-run (ADD COLUMN IF NOT EXISTS). Reads DATABASE_URL from .env.local
 * like the other scripts do.
 */
import { connect } from "./lib/db.mjs";

const sql = connect();

// Last time a reset mail went out for this address. Same reason as
// verification_sent_at: the limiter in src/lib/rate-limit.ts counts per IP in
// one instance's memory, so on Vercel it cannot stop a mail flood aimed at a
// single mailbox. Left NULL for everyone — nobody has requested a reset yet,
// and a NULL simply means "no cooldown running".
await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_sent_at TIMESTAMPTZ`;

const [counts] = await sql`
  SELECT count(*)::int AS total, count(reset_sent_at)::int AS with_reset FROM users
`;
console.log(`users: ${counts.total} total, ${counts.with_reset} with a reset send recorded`);
