import "server-only";
import { headers } from "next/headers";

/**
 * Minimal per-IP rate limiter for Server Actions and route handlers.
 *
 * The counters live in the process memory of a single instance, so a serverless
 * deployment can run several of them side by side and the real ceiling is a
 * multiple of `limit`. That is deliberate: this is a speed bump against scripted
 * abuse (credential stuffing, flooding the admin inbox), not a hard quota. A
 * distributed limiter would need Redis or a table, which this project does not
 * have yet.
 */

interface Window {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, Map<string, Window>>();

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
 * Counts one hit for `bucket` + caller IP and reports whether the caller is
 * over the limit. Windows are fixed: the first hit opens a window of
 * `windowMs`, everything after it counts against the same window.
 */
export async function rateLimited(
  bucket: string,
  { limit, windowMs }: { limit: number; windowMs: number }
): Promise<boolean> {
  const ip = await clientIp();
  let windows = buckets.get(bucket);
  if (!windows) {
    windows = new Map<string, Window>();
    buckets.set(bucket, windows);
  }

  const now = Date.now();
  // Long-lived instances would otherwise keep one entry per IP forever.
  if (windows.size > 5000) {
    for (const [key, w] of windows) if (now > w.resetAt) windows.delete(key);
  }

  const entry = windows.get(ip);
  if (!entry || now > entry.resetAt) {
    windows.set(ip, { count: 1, resetAt: now + windowMs });
    return false;
  }
  entry.count += 1;
  return entry.count > limit;
}

export const MINUTE_MS = 60 * 1000;
export const TEN_MINUTES_MS = 10 * MINUTE_MS;
