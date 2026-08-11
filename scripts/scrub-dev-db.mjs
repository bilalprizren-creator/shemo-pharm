/**
 * Makes the development database safe to develop against.
 *
 *   node scripts/scrub-dev-db.mjs
 *
 * The development database starts life as a Neon branch of production, which
 * means it starts with a copy of every real customer: their address, their phone
 * number, their password hash, the messages they sent and the orders they placed.
 * That is a second copy of personal data sitting behind credentials that get
 * pasted into terminals, and it is worse than untidy — RESEND_API_KEY is shared
 * with production, so a developer exercising the password-reset flow against a
 * "safe" dev database would send real email to a real pharmacy customer.
 *
 * So: the catalogue stays (products, categories and their links are public
 * information and the whole point of having realistic dev data), and everything
 * that identifies a person goes, replaced by one dev admin.
 *
 * REFUSES TO RUN AGAINST PRODUCTION. Not by checking a flag it was passed, but by
 * requiring target() to be development and re-checking the host against
 * DATABASE_URL_PRODUCTION — this is a deleting script, so the guard does not rely
 * on the caller having been careful.
 */
import { randomBytes, scryptSync } from "node:crypto";
import { connect, describeTarget, loadEnv, target } from "./lib/db.mjs";

loadEnv();

if (target() !== "development") {
  console.error(
    `refusing to run: DATABASE_TARGET is "${target()}". This script deletes every ` +
      "customer, message and order, and only ever makes sense against development."
  );
  process.exit(1);
}

const devUrl = process.env.DATABASE_URL_DEVELOPMENT ?? process.env.DATABASE_URL;
const prodUrl = process.env.DATABASE_URL_PRODUCTION;
if (devUrl && prodUrl) {
  const host = (u) => new URL(u).hostname;
  if (host(devUrl) === host(prodUrl)) {
    console.error(
      `refusing to run: the development URL points at the same host as ` +
        `DATABASE_URL_PRODUCTION (${host(prodUrl)}). They are not separated yet.`
    );
    process.exit(1);
  }
}

const sql = connect();

/** Same format as hashPassword() in src/lib/auth.ts. */
function hashPassword(password) {
  const salt = randomBytes(16).toString("hex");
  return `${salt}:${scryptSync(password, salt, 64).toString("hex")}`;
}

const before = await sql`
  SELECT (SELECT count(*)::int FROM users) AS users,
         (SELECT count(*)::int FROM orders) AS orders,
         (SELECT count(*)::int FROM contact_messages) AS messages,
         (SELECT count(*)::int FROM products) AS products,
         (SELECT count(*)::int FROM categories) AS categories
`;
console.log(
  `before: ${before[0].users} users, ${before[0].orders} orders, ` +
    `${before[0].messages} messages, ${before[0].products} products`
);

// Personal data out. product_categories is untouched, so the catalogue keeps its
// shape.
await sql`DELETE FROM contact_messages`;
await sql`DELETE FROM orders`;
await sql`DELETE FROM users`;
// Counters keyed on hashed IPs — worthless here and only ever confusing.
await sql`DELETE FROM rate_limits`;

const email = process.env.DEV_ADMIN_EMAIL ?? "dev@localhost.invalid";
// Generated rather than reusing ADMIN_PASSWORD: that one opens the live panel, and
// a dev database is not a place to put it.
const password = process.env.DEV_ADMIN_PASSWORD ?? `dev-${randomBytes(6).toString("hex")}`;

await sql`
  INSERT INTO users (email, password_hash, name, company, phone, status, role,
                     lang, email_verified_at)
  VALUES (${email}, ${hashPassword(password)}, 'Dev Admin', 'dev', '000',
          'approved', 'admin', 'sq', now())
  ON CONFLICT (email) DO UPDATE
    SET password_hash = EXCLUDED.password_hash, role = 'admin', status = 'approved'
`;

const after = await sql`
  SELECT (SELECT count(*)::int FROM users) AS users,
         (SELECT count(*)::int FROM orders) AS orders,
         (SELECT count(*)::int FROM contact_messages) AS messages,
         (SELECT count(*)::int FROM products) AS products,
         (SELECT count(*)::int FROM product_categories) AS links
`;
console.log(
  `after:  ${after[0].users} users, ${after[0].orders} orders, ` +
    `${after[0].messages} messages, ${after[0].products} products, ${after[0].links} links`
);
console.log(`\n${describeTarget()}`);
console.log(`dev admin: ${email}`);
console.log(`password:  ${password}`);
console.log("\nThis password opens the dev panel only. Nothing here is production.");
