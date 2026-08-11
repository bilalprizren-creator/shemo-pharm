import { NextResponse } from "next/server";
import { MINUTE_MS, rateLimited } from "@/lib/rate-limit";

/**
 * Where the browser sends Content-Security-Policy violations.
 *
 * The policy has been report-only since it shipped, which meant every directive
 * in it was advisory *and* unverifiable: a violation existed for as long as
 * somebody had a console open on the right page. Deciding to enforce the policy
 * on that basis is guessing. This endpoint is what turns the decision into a
 * question with an answer — see the checklist in src/lib/csp.ts.
 *
 * Three deliberate absences:
 *
 *   - no authentication. The reporter is a browser acting on its own, often on a
 *     page nobody is signed in on.
 *   - no origin check, unlike every other POST here. Browsers send reports with
 *     `Origin: null` or no Origin at all; requiring one would reject exactly the
 *     traffic this exists to receive. Safe because the only side effect below is
 *     a log line.
 *   - no database. An unauthenticated, unbounded, browser-driven write path into
 *     Postgres is precisely the shape of thing that spent this project's entire
 *     free blob-write quota in one afternoon. Vercel's runtime logs are already
 *     queryable and drainable and cost nothing to fill.
 *
 * Always answers 204, whatever happened. A browser does not read the body and
 * cannot fix anything; a 4xx just invites it to retry.
 */

/** Enough for any real report; a body past this is not a browser being helpful. */
const MAX_BODY_BYTES = 8 * 1024;

/**
 * Generous, because one broken directive on a busy page produces a report per
 * visitor, and this must never be the thing that goes down. Stays on the
 * in-process limiter — a violation report is not worth a database round trip.
 */
const REPORT_LIMIT = { limit: 120, windowMs: MINUTE_MS };

const noContent = () => new NextResponse(null, { status: 204 });

interface Violation {
  directive: string;
  blocked: string;
  document: string;
  disposition: string;
}

export async function POST(request: Request): Promise<NextResponse> {
  if (await rateLimited("csp-report", REPORT_LIMIT)) return noContent();

  const declared = Number(request.headers.get("content-length") ?? "");
  if (Number.isFinite(declared) && declared > MAX_BODY_BYTES) return noContent();

  let raw: string;
  try {
    raw = await request.text();
  } catch {
    return noContent();
  }
  // Again, because content-length is the caller's claim and may be absent.
  if (raw.length > MAX_BODY_BYTES) return noContent();

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return noContent();
  }

  for (const violation of readViolations(parsed)) {
    // One line per violation, in the same shape as everything else worth
    // grepping for. Fields are whitelisted rather than spread: a report carries
    // the full document URL, and a page reached from a verification or reset
    // link has a token in it that must not end up in a log.
    console.warn(
      `[csp] ${JSON.stringify({
        directive: violation.directive,
        blocked: violation.blocked,
        document: violation.document,
        disposition: violation.disposition,
      })}`
    );
  }

  return noContent();
}

/**
 * Normalises the two wire formats into one shape.
 *
 * `application/csp-report` sends a single object under a "csp-report" key with
 * hyphenated field names; `application/reports+json` sends an array of reports
 * with camelCase names nested under "body". Browsers disagree about which they
 * send and some send both, so both are read.
 */
function readViolations(parsed: unknown): Violation[] {
  if (Array.isArray(parsed)) {
    return parsed.flatMap((entry) => {
      const report = asRecord(entry);
      if (!report || report.type !== "csp-violation") return [];
      const body = asRecord(report.body);
      if (!body) return [];
      return [
        {
          directive: field(body.effectiveDirective ?? body.violatedDirective),
          blocked: safeUrl(body.blockedURL),
          document: safePath(body.documentURL),
          disposition: field(body.disposition),
        },
      ];
    });
  }

  const outer = asRecord(parsed);
  const legacy = asRecord(outer?.["csp-report"]);
  if (!legacy) return [];
  return [
    {
      directive: field(legacy["effective-directive"] ?? legacy["violated-directive"]),
      blocked: safeUrl(legacy["blocked-uri"]),
      document: safePath(legacy["document-uri"]),
      disposition: field(legacy.disposition),
    },
  ];
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

/** A short, plain string, or "?" — never whatever arbitrary JSON arrived. */
function field(value: unknown): string {
  if (typeof value !== "string" || !value) return "?";
  return value.slice(0, 200).replace(/[\r\n]+/g, " ");
}

/** Origin and path only. Drops query strings, which can carry tokens. */
function safeUrl(value: unknown): string {
  const text = field(value);
  // CSP also uses bare keywords here: "inline", "eval", "data", "blob".
  if (!text.includes("://")) return text;
  try {
    const url = new URL(text);
    return `${url.origin}${url.pathname}`;
  } catch {
    return "?";
  }
}

/** Path only — which page, without which visitor. */
function safePath(value: unknown): string {
  const text = field(value);
  if (!text.includes("://")) return text.split("?")[0] ?? "?";
  try {
    return new URL(text).pathname;
  } catch {
    return "?";
  }
}
