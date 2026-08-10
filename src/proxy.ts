import { NextResponse, type NextRequest } from "next/server";
import { CSP_HEADER, contentSecurityPolicy } from "@/lib/csp";

/**
 * Two jobs, in this order:
 *
 * 1. Content-Security-Policy. A fresh nonce per request, set on both the
 *    request (Next reads it back out while rendering and stamps it on every
 *    script it emits) and the response (the browser enforces it). See
 *    src/lib/csp.ts for the directives and why each one is there.
 *
 * 2. Locale routing: Albanian (default) lives at the bare URLs and is
 *    internally rewritten to /sq/... so the app/[lang] segment can handle it;
 *    English is served under the visible /en prefix. Direct /sq/... hits are
 *    redirected to the bare URL so each page has exactly one canonical path.
 */
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");
  const csp = contentSecurityPolicy(
    nonce,
    process.env.NODE_ENV === "development"
  );

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set(CSP_HEADER, csp);

  const withCsp = <T extends NextResponse>(response: T): T => {
    response.headers.set(CSP_HEADER, csp);
    return response;
  };

  // The admin panel lives outside the locale tree and must not be rewritten —
  // it is here only to be covered by the policy, which is the part of the site
  // most worth protecting.
  if (pathname === "/admin" || pathname.startsWith("/admin/")) {
    return withCsp(NextResponse.next({ request: { headers: requestHeaders } }));
  }

  if (pathname === "/en" || pathname.startsWith("/en/")) {
    // matches app/[lang] with lang = "en". Passing the headers through matters:
    // returning nothing would leave the renderer without a nonce.
    return withCsp(NextResponse.next({ request: { headers: requestHeaders } }));
  }

  if (pathname === "/sq" || pathname.startsWith("/sq/")) {
    const url = request.nextUrl.clone();
    url.pathname = pathname.slice(3) || "/";
    return withCsp(NextResponse.redirect(url, 308));
  }

  const url = request.nextUrl.clone();
  url.pathname = `/sq${pathname}`;
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
