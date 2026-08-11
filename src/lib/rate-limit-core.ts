/**
 * The rate limiter's arithmetic, with nothing attached to it.
 *
 * Split out of rate-limit.ts so the part that can be subtly wrong — where a
 * window starts, whether the limit is off by one, what happens when the store
 * fails — is testable without a database, a request or a clock. rate-limit.ts is
 * then only wiring.
 */

export interface RateLimitHit {
  bucket: string;
  /** Who is being counted. Never a raw IP by the time it gets here. */
  subject: string;
  windowMs: number;
  /**
   * Advisory. A store that can derive the window itself should — the Postgres
   * one computes it from now() inside the statement, so two instances with
   * skewed clocks cannot disagree about which window a hit belongs to.
   */
  nowMs: number;
}

export interface RateLimitStore {
  /** Counts one hit and answers with the running count inside its window. */
  hit(args: RateLimitHit): Promise<number>;
}

/**
 * Fixed windows: the start is the epoch floored to a multiple of windowMs, so
 * every caller and every instance agrees on the boundary without coordinating.
 * The Postgres store computes the same expression in SQL, which is what makes
 * the two stores interchangeable.
 */
export function windowStartMs(nowMs: number, windowMs: number): number {
  return Math.floor(nowMs / windowMs) * windowMs;
}

interface Window {
  count: number;
  resetAt: number;
}

/** Long-lived instances would otherwise keep one entry per subject forever. */
const MAX_TRACKED_SUBJECTS = 5000;

/**
 * The original limiter: counters in this process's memory.
 *
 * Still here for two jobs. It is the store for the buckets that must not cost a
 * database round trip (search, wishlist, CSP reports), and it is what the durable
 * store falls back to when Postgres is unreachable — a degraded speed bump beats
 * no limit at all.
 */
export function createMemoryStore(): RateLimitStore {
  const buckets = new Map<string, Map<string, Window>>();

  return {
    async hit({ bucket, subject, windowMs, nowMs }: RateLimitHit): Promise<number> {
      let windows = buckets.get(bucket);
      if (!windows) {
        windows = new Map<string, Window>();
        buckets.set(bucket, windows);
      }

      if (windows.size > MAX_TRACKED_SUBJECTS) {
        for (const [key, w] of windows) if (nowMs > w.resetAt) windows.delete(key);
      }

      const resetAt = windowStartMs(nowMs, windowMs) + windowMs;
      const entry = windows.get(subject);
      if (!entry || nowMs >= entry.resetAt) {
        windows.set(subject, { count: 1, resetAt });
        return 1;
      }
      entry.count += 1;
      return entry.count;
    },
  };
}

export interface RateLimitCheck extends RateLimitHit {
  store: RateLimitStore;
  limit: number;
  /** Used when `store` throws. */
  fallback?: RateLimitStore;
  onError?: (err: unknown) => void;
}

/**
 * Whether this caller is over the limit.
 *
 * Fails open, and that is a decision rather than an oversight. Every path this
 * limiter guards has a stronger gate behind it — password verification,
 * requireAdmin(), the per-address send cooldowns in auth.ts — so treating a
 * database hiccup as "over the limit" would convert a transient Neon blip into a
 * total login, search and contact-form outage for every visitor, to close an
 * abuse window measured in seconds. It falls back to the in-memory store first,
 * so the degraded state is the behaviour this project had until now, not nothing.
 */
export async function checkRateLimit({
  store,
  fallback,
  onError,
  limit,
  ...hit
}: RateLimitCheck): Promise<boolean> {
  try {
    return (await store.hit(hit)) > limit;
  } catch (err) {
    onError?.(err);
    if (!fallback) return false;
    try {
      return (await fallback.hit(hit)) > limit;
    } catch {
      return false;
    }
  }
}
