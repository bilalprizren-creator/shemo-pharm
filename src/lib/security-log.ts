import "server-only";
import { clientIp } from "@/lib/rate-limit";

/**
 * One line of JSON per security-relevant event, on stdout.
 *
 * Deliberately not a database table. Vercel's runtime logs are already
 * queryable and drainable, and adding a table would mean an unauthenticated
 * visitor's failed login writes a row — a write path opened by anyone, with a
 * retention policy nobody has decided yet. A log line costs nothing, survives
 * being wrong, and can be pointed at a drain the day somebody wants alerts. If
 * an auditable in-app trail is ever wanted, that is a separate decision with a
 * retention answer attached.
 *
 * The single-line JSON shape is what makes it greppable: filter on `[security]`
 * for everything, or on `"event":"admin-login-failed"` for the one alert worth
 * having on day one.
 *
 * What must never appear in here: passwords, password hashes, session tokens,
 * verification or reset tokens, or anything read out of a request body. Email
 * addresses do appear — an admin login trail that does not say who is useless —
 * so this is the reason these lines belong in a log with an access policy and
 * not in an analytics pipeline.
 */

export type SecurityEvent =
  /* authentication */
  | "admin-login"
  | "admin-login-failed"
  | "admin-login-not-admin"
  | "admin-login-rate-limited"
  | "admin-logout"
  /* authorization */
  | "admin-api-unauthorized"
  | "admin-api-bad-origin"
  /* admin mutations */
  | "admin-mutation"
  /* uploads */
  | "upload-accepted"
  | "upload-rejected";

type Detail = Record<string, string | number | boolean | null | undefined>;

/** Keeps one runaway field from filling a log line. */
function clip(value: string): string {
  return value.length > 200 ? `${value.slice(0, 200)}…` : value;
}

export async function logSecurityEvent(
  event: SecurityEvent,
  detail: Detail = {}
): Promise<void> {
  let ip = "unknown";
  try {
    ip = await clientIp();
  } catch {
    // Called outside a request scope (an after() callback that outlived it, a
    // script). The event still matters more than the address it came from.
  }

  const fields: Record<string, string | number | boolean | null> = {};
  for (const [key, value] of Object.entries(detail)) {
    if (value === undefined) continue;
    fields[key] = typeof value === "string" ? clip(value) : value;
  }

  const line = JSON.stringify({
    event,
    ip,
    at: new Date().toISOString(),
    ...fields,
  });

  // console.warn rather than log: on Vercel it lands at a level a drain filter
  // and an alert rule can pick out without matching every ordinary log line.
  console.warn(`[security] ${line}`);
}
