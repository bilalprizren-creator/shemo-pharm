import "server-only";
import { headers } from "next/headers";
import { createHash } from "node:crypto";
import {
  checkRateLimit,
  createMemoryStore,
  type RateLimitStore,
} from "@/lib/rate-limit-core";
import { createPostgresStore } from "@/lib/rate-limits-pg";

/**
 * Per-IP rate limiter for Server Actions and route handlers.
 *
 * The signature has not changed, so none of the twelve call sites did. What
 * changed is where the counters live. They used to live only in the process
 * memory of one instance, which the old docstring was candid about: "a serverless
 * deployment can run several of them side by side and the real ceiling is a
 * multiple of `limit`." For the search endpoint that is an honest speed bump. For
 * the admin login it meant ten attempts per warm instance, which is not a
 * brute-force bound — so the buckets where the limit is the security control now
 * count in Postgres, where there is one counter.
 *
 * The rest stay in memory on purpose. /api/kerko fires on a debounced keystroke
 * and is CDN-cached; adding a database round trip to it would be a visible
 * latency regression in exchange for protecting a read-only endpoint that costs
 * nothing to serve.
 */

/**
 * The buckets whose limit is a security control rather than a courtesy. These
 * count in Postgres; everything else counts in memory.
 */
const DURABLE_BUCKETS = new Set([
  "admin-auth",
  "auth",
  "reset-request",
  "reset-submit",
  "verify",
  "contact",
  "order",
  "admin-upload",
]);

/**
 * Whether to use the database at all.
 *
 * Off in local development, where the alternative is a Neon round trip on every
 * keystroke in the search bar against the production database. Overridable so the
 * durable path can actually be exercised by hand before it is trusted.
 */
const useDurableStore =
  process.env.VERCEL === "1" || process.env.RATE_LIMIT_STORE === "postgres";

// Module scope, so the in-memory counters survive between requests on one
// instance — which is the only reason they are worth anything.
const memoryStore = createMemoryStore();
let postgresStore: RateLimitStore | null = null;

function storeFor(bucket: string): { store: RateLimitStore; fallback?: RateLimitStore } {
  if (!useDurableStore || !DURABLE_BUCKETS.has(bucket)) return { store: memoryStore };
  postgresStore ??= createPostgresStore();
  return { store: postgresStore, fallback: memoryStore };
}

/** The caller's IP as seen behind the Vercel proxy; "local" in development. */
export async function clientIp(): Promise<string> {
  const h = await headers();
  return (
    h.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    h.get("x-real-ip") ||
    "local"
  );
}

/**
 * The identifier the counters are keyed on: a keyed hash of the address, not the
 * address.
 *
 * One line, and it means the rate_limits table holds no personal data — nothing
 * in it identifies a visitor, and it never has to appear in an answer to a
 * data-subject request. The key is AUTH_SECRET, so the hashes are not reversible
 * by anyone holding a copy of the table alone.
 */
function subjectFor(ip: string): string {
  return createHash("sha256")
    .update(`${ip}:${process.env.AUTH_SECRET ?? ""}`)
    .digest("hex")
    .slice(0, 32);
}

/**
 * Counts one hit for `bucket` + caller IP and reports whether the caller is
 * over the limit. Windows are fixed: the first hit opens a window of
 * `windowMs`, everything after it counts against the same window.
 */
export async function rateLimited(
  bucket: string,
  { limit, windowMs }: { limit: number; windowMs: number }
): Promise<boolean> {
  const { store, fallback } = storeFor(bucket);
  return checkRateLimit({
    store,
    fallback,
    bucket,
    subject: subjectFor(await clientIp()),
    limit,
    windowMs,
    nowMs: Date.now(),
    onError: (err) => {
      // Loud, because the effective limit has just silently loosened to the
      // per-instance one. Not fatal, because refusing every login over a
      // database hiccup is worse than the abuse window it would close.
      console.error(`[rate-limit] ${bucket} fell back to in-memory counting:`, err);
    },
  });
}

export const MINUTE_MS = 60 * 1000;
export const TEN_MINUTES_MS = 10 * MINUTE_MS;
