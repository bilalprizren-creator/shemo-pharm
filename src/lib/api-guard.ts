import "server-only";
import { NextResponse } from "next/server";
import { getSession, isAdmin, type Session } from "@/lib/auth";
import { requestIsSameOrigin } from "@/lib/origin";
import { logSecurityEvent } from "@/lib/security-log";

/**
 * The route-handler counterpart to requireAdmin().
 *
 * requireAdmin() answers an unauthorized caller with a redirect to the login
 * page, which is the right answer for a page and nonsense for a fetch — the
 * browser follows it and the uploader receives an HTML login form where it
 * expected JSON. So route handlers get this instead, and requireAdmin() stays
 * page-only.
 *
 * The return type is a tagged union rather than `Session | NextResponse`.
 * Narrowing on `instanceof NextResponse` would work, but a caller who forgets to
 * check at all gets a response object typed as a session and every field reads
 * back undefined — silently authorizing nobody as somebody. With `ok`,
 * forgetting is a type error.
 */

export type Guard<T> =
  | { ok: true; value: T }
  | { ok: false; response: NextResponse };

/**
 * The only shape an error leaves these routes in: a code from a closed set,
 * nothing else. No message, no path, no provider text, no stack. The client maps
 * the code to a sentence; whoever is debugging reads the real error in the
 * runtime log.
 */
export function apiError(code: string, status: number): NextResponse {
  return NextResponse.json(
    { error: code },
    { status, headers: { "Cache-Control": "no-store" } }
  );
}

/**
 * Requires an admin session, and for a mutating request also requires that it
 * came from our own origin.
 *
 * Order matters: the origin check runs first because it needs no database at
 * all, so a cross-site probe is refused without costing a query.
 */
export async function requireAdminApi(
  request: Request,
  { mutating }: { mutating: boolean }
): Promise<Guard<Session>> {
  if (mutating && !requestIsSameOrigin(request)) {
    await logSecurityEvent("admin-api-bad-origin", {
      path: new URL(request.url).pathname,
      origin: request.headers.get("origin") ?? null,
    });
    return { ok: false, response: apiError("bad_origin", 403) };
  }

  const session = await getSession();
  if (!isAdmin(session)) {
    await logSecurityEvent("admin-api-unauthorized", {
      path: new URL(request.url).pathname,
      // Says whether this was "nobody" or "somebody without the role", which is
      // the difference between an expired session and an actual attempt.
      as: session?.email ?? null,
    });
    return { ok: false, response: apiError("unauthorized", 401) };
  }

  return { ok: true, value: session as Session };
}
