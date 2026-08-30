import { NextResponse, type NextRequest } from "next/server";
import {
  CSP_HEADER,
  REPORTING_ENDPOINTS_HEADER,
  REPORTING_ENDPOINTS_VALUE,
  contentSecurityPolicy,
} from "@/lib/csp";
import { SITE_MODE_HEADER, isSharedPath, modeForHost } from "@/lib/site-mode";

/**
 * Three jobs, in this order:
 *
 * 1. Content-Security-Policy. A fresh nonce per request, set on both the
 *    request (Next reads it back out while rendering and stamps it on every
 *    script it emits) and the response (the browser enforces it). See
 *    src/lib/csp.ts for the directives and why each one is there.
 *
 * 2. Which of the two sites this is. The deployment answers on both the shop's
 *    domain and the printed catalogue's, and the hostname is the only thing
 *    that says which — passed on as the `x-site` header for the layout and the
 *    components to read. See src/lib/site-mode.ts.
 *
 * 3. Locale routing: Albanian (default) lives at the bare URLs and is
 *    internally rewritten to /sq/... so the app/[lang] segment can handle it;
 *    English is served under the visible /en prefix. Direct /sq/... hits are
 *    redirected to the bare URL so each page has exactly one canonical path.
 *
 * On a catalogue host the locale rewrite also folds the path into the catalogue
 * tree, so `/` is the contents and `/6-7-cansin` is a section — the domain
 * already says "katalog" and need not repeat it in every URL.
 */
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const mode = modeForHost(
    request.headers.get("x-forwarded-host") ?? request.headers.get("host")
  );

  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");
  const csp = contentSecurityPolicy(
    nonce,
    process.env.NODE_ENV === "development"
  );

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set(CSP_HEADER, csp);
  requestHeaders.set(SITE_MODE_HEADER, mode);

  const withCsp = <T extends NextResponse>(response: T): T => {
    response.headers.set(CSP_HEADER, csp);
    // Resolves the group name in the policy's `report-to` directive. Without it
    // that directive names a destination the browser cannot look up, and only
    // the deprecated `report-uri` still works.
    response.headers.set(REPORTING_ENDPOINTS_HEADER, REPORTING_ENDPOINTS_VALUE);
    return response;
  };

  // The admin panel lives outside the locale tree and must not be rewritten —
  // it is here only to be covered by the policy, which is the part of the site
  // most worth protecting.
  if (pathname === "/admin" || pathname.startsWith("/admin/")) {
    return withCsp(NextResponse.next({ request: { headers: requestHeaders } }));
  }

  if (pathname === "/sq" || pathname.startsWith("/sq/")) {
    const url = request.nextUrl.clone();
    url.pathname = pathname.slice(3) || "/";
    return withCsp(NextResponse.redirect(url, 308));
  }

  // Split off the locale so the catalogue mapping below sees the same path
  // whichever language it is in.
  const isEnglish = pathname === "/en" || pathname.startsWith("/en/");
  const localePrefix = isEnglish ? "/en" : "/sq";
  const rest = isEnglish ? pathname.slice(3) || "/" : pathname;

  // On a catalogue host the site *is* the catalogue, so its pages sit at the
  // root: "/" is the contents, "/6-7-cansin" a section, "/shtyp" the print
  // sheet. The shared pages — the partner login above all, since prices hang
  // off it — keep their own paths on both sites.
  const inner =
    mode === "katalog" && !isSharedPath(rest)
      ? rest === "/"
        ? "/katalog"
        : `/katalog${rest}`
      : rest;

  // English already carries a visible /en, so nothing to rewrite unless the
  // catalogue mapping changed the path underneath it.
  if (isEnglish && inner === rest) {
    // Passing the headers through matters: returning nothing would leave the
    // renderer without a nonce.
    return withCsp(NextResponse.next({ request: { headers: requestHeaders } }));
  }

  const url = request.nextUrl.clone();
  url.pathname = `${localePrefix}${inner}`;
  return withCsp(
    NextResponse.rewrite(url, { request: { headers: requestHeaders } })
  );
}

export const config = {
  // Skip API routes, Next internals, metadata routes and any file with an
  // extension (public/ assets like /logo.svg, /photos/*.jpg, /brands/*.png).
  //
  // `admin` is deliberately no longer excluded — it needs the CSP header, and
  // the handler above returns early for it without touching the path.
  //
  // The Next CSP guide suggests also excluding prefetches. Not here: this proxy
  // does the locale rewrite as well, and a prefetch of /produktet that never
  // reaches /sq/produktet would poison the router cache with a 404.
  matcher: [
    "/((?!api|_next/static|_next/image|favicon\\.ico|robots\\.txt|sitemap\\.xml|opengraph-image|.*\\..*).*)",
  ],
};
