import { NextResponse } from "next/server";
import { sql } from "@/lib/db";

/**
 * Is this deployment able to do its job?
 *
 * There was no way to ask. Every failure path in this project ends at
 * console.error — the mail sender, the rate limiter, the upload route, the
 * verification link — and nobody watches those, so the first report of a broken
 * database or an expired key came from a pharmacy on the phone.
 *
 * Names no values, only whether each one is set. A health endpoint is
 * unauthenticated by nature, so it must not become a way to read the
 * environment: "database": "ok" is a fact about the deployment, the connection
 * string is a secret. The check itself is `SELECT 1` — enough to prove the
 * pooler answers and the credentials work, cheap enough to be polled.
 */
export const dynamic = "force-dynamic";

export async function GET(): Promise<NextResponse> {
  const started = Date.now();

  let database: "ok" | "down" = "down";
  try {
    await sql`SELECT 1`;
    database = "ok";
  } catch (err) {
    console.error("[health] database unreachable:", err);
  }

  const configured = {
    mail: Boolean(process.env.RESEND_API_KEY?.trim()),
    blob: Boolean(process.env.BLOB_READ_WRITE_TOKEN?.trim()),
    auth: Boolean(process.env.AUTH_SECRET?.trim()),
  };

  // Mail and blob are degradations, not outages: the catalogue serves fine
  // without either, and the blob store is knowingly off while its billing is.
  // A missing AUTH_SECRET means nobody can log in, which is an outage.
  const ok = database === "ok" && configured.auth;

  return NextResponse.json(
    {
      ok,
      database,
      configured,
      env: process.env.VERCEL_ENV ?? "local",
      ms: Date.now() - started,
    },
    {
      status: ok ? 200 : 503,
      headers: { "Cache-Control": "no-store" },
    }
  );
}
