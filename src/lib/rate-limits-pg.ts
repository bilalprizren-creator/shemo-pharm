import "server-only";
import { after } from "next/server";
import { sql } from "@/lib/db";
import type { RateLimitHit, RateLimitStore } from "@/lib/rate-limit-core";

/**
 * Rate-limit counters in Postgres, so the limit is one limit.
 *
 * The in-memory limiter this supplements counts inside one instance's process
 * memory, which on Vercel means the real ceiling is `limit` multiplied by however
 * many instances happen to be warm. For a search endpoint that is fine. For the
 * admin login it is not a brute-force bound at all — the nominal ten attempts per
 * ten minutes was ten per instance, and nothing stops a caller from being spread
 * across instances.
 *
 * One table, one statement per hit, no new infrastructure. Redis would be the
 * textbook answer and would mean a second service to provision, pay for and keep
 * alive for a site whose entire limiter traffic is a few hundred hits a day.
 */

/** How often a hit also pays for cleanup. One statement per 500 hits, amortised. */
const CLEANUP_ODDS = 500;

/** Windows older than this are of no interest to anybody. */
const CLEANUP_AFTER = "1 day";

export function createPostgresStore(): RateLimitStore {
  return {
    async hit({ bucket, subject, windowMs }: RateLimitHit): Promise<number> {
      const windowSeconds = Math.max(1, Math.round(windowMs / 1000));

      /**
       * Increment and read in one atomic statement, so two concurrent requests
       * cannot both read the same count and both decide they are under the limit.
       *
       * window_start is computed here from now() rather than passed in from the
       * caller's clock: instances do not share a clock, and a few hundred
       * milliseconds of skew across a boundary would put two hits in different
       * windows and hand out double the allowance. `nowMs` is therefore unused,
       * which the interface documents as allowed.
       */
      const rows = (await sql`
        INSERT INTO rate_limits (bucket, subject, window_start, count)
        VALUES (
          ${bucket},
          ${subject},
          to_timestamp(
            floor(extract(epoch FROM now()) / ${windowSeconds}) * ${windowSeconds}
          ),
          1
        )
        ON CONFLICT (bucket, subject, window_start)
        DO UPDATE SET count = rate_limits.count + 1
        RETURNING count
      `) as { count: number }[];

      maybeCleanUp();
      return rows[0]?.count ?? 1;
    },
  };
}

/**
 * Deletes expired rows occasionally, from inside a request that was going to the
 * database anyway.
 *
 * Probabilistic rather than scheduled: a cron job would need a route, a secret
 * and a vercel.json for a `DELETE` that takes milliseconds. Runs after the
 * response is on its way, so it never adds latency, and is swallowed whole —
 * failing to tidy up is not a reason to refuse a request.
 */
function maybeCleanUp(): void {
  if (Math.random() >= 1 / CLEANUP_ODDS) return;
  try {
    after(async () => {
      try {
        await sql`
          DELETE FROM rate_limits
          WHERE window_start < now() - ${CLEANUP_AFTER}::interval
        `;
      } catch (err) {
        console.error("[rate-limit] could not prune old windows:", err);
      }
    });
  } catch {
    // after() throws outside a request scope. Nothing to do about it here.
  }
}
