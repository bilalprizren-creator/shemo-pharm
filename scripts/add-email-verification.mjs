/**
 * Migration: email verification on `users`, plus the locale the customer
 * registered in. Safe to re-run (ADD COLUMN IF NOT EXISTS, idempotent backfill).
 *
 *   node scripts/add-email-verification.mjs
 *
 * Reads DATABASE_URL from .env.local like the other scripts do.
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

// When the mailbox was proven to belong to the account. NULL = unverified.
// Deliberately NOT folded into `status`: that column is the admin's business
// approval and gates wholesale prices, this one only says the address is real.
await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified_at TIMESTAMPTZ`;

// Last time a verification mail went out. Backs the per-address resend cap:
// the limiter in src/lib/rate-limit.ts counts per IP in one instance's memory,
// so on Vercel it cannot stop a mail flood aimed at a single mailbox.
await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS verification_sent_at TIMESTAMPTZ`;

// The locale chosen at registration. The approval mail is sent from the admin
// panel, where there is no customer request to read a language from.
await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS lang TEXT NOT NULL DEFAULT 'sq'`;

// Accounts that predate verification: approved customers were vetted by hand
// and admins own their own address, so grandfather both rather than mailing
// the existing customer base. Pending rows stay NULL, which is what makes the
// badge in /admin/kerkesat meaningful for new requests.
await sql`
  UPDATE users SET email_verified_at = created_at
  WHERE email_verified_at IS NULL AND (status = 'approved' OR role = 'admin')
`;

const [counts] = await sql`
  SELECT count(*)::int                                          AS total,
         count(email_verified_at)::int                          AS verified,
         count(*) FILTER (WHERE email_verified_at IS NULL)::int AS unverified
  FROM users
`;
console.log(
  `users: ${counts.total} total, ${counts.verified} verified, ${counts.unverified} awaiting verification`
);
