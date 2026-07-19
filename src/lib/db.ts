import "server-only";
import { neon } from "@neondatabase/serverless";

/**
 * Single Neon (Postgres) client for the whole app. Uses the serverless HTTP
 * driver, which works on both the Node.js and Edge runtimes and needs no
 * connection pooling of our own. Query with the tagged template:
 *
 *   const rows = await sql`SELECT * FROM products WHERE id = ${id}`;
 *
 * All access is server-only; never import this from a client component.
 */
const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error(
    "DATABASE_URL is not set. Add it to .env.local (and to the Vercel project env)."
  );
}

export const sql = neon(connectionString);
