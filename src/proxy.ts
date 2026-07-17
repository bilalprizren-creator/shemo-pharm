import { NextResponse, type NextRequest } from "next/server";

/**
 * Locale routing: Albanian (default) lives at the bare URLs and is
 * internally rewritten to /sq/... so the app/[lang] segment can handle it;
 * English is served under the visible /en prefix. Direct /sq/... hits are
 * redirected to the bare URL so each page has exactly one canonical path.
 */
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname === "/en" || pathname.startsWith("/en/")) {
    return; // matches app/[lang] with lang = "en"
  }

  if (pathname === "/sq" || pathname.startsWith("/sq/")) {
    const url = request.nextUrl.clone();
    url.pathname = pathname.slice(3) || "/";
    return NextResponse.redirect(url, 308);
  }

  const url = request.nextUrl.clone();
  url.pathname = `/sq${pathname}`;
  return NextResponse.rewrite(url);
}

export const config = {
  // Skip API routes, Next internals, metadata routes and any file with an
  // extension (public/ assets like /logo.svg, /photos/*.jpg, /brands/*.png).
  matcher: [
    "/((?!api|_next/static|_next/image|favicon\\.ico|robots\\.txt|sitemap\\.xml|opengraph-image|.*\\..*).*)",
  ],
};
