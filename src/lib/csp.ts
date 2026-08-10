import { REMOTE_IMAGE_PATTERNS } from "@/lib/images";

/**
 * The site's Content-Security-Policy.
 *
 * Built here rather than in next.config.ts because it needs a fresh nonce per
 * request, which only the proxy can produce. next.config.ts still carries the
 * static headers (nosniff, referrer policy, frame options, permissions policy).
 *
 * Next.js reads the nonce back out of this header while rendering and attaches
 * it to the framework scripts, the page bundles and its own inline styles. The
 * two inline scripts this project writes by hand — the scroll reset in the
 * locale layout and the JSON-LD blocks — take it from the `x-nonce` request
 * header instead.
 *
 * Shipped as Content-Security-Policy-Report-Only first: the site is live, and a
 * directive that is one host short is a blank page for a real customer. Flip
 * REPORT_ONLY to false once the browser console stays quiet across the
 * homepage, a listing, a product page, the cart drawer and the admin panel.
 */
export const REPORT_ONLY = true;

export const CSP_HEADER = REPORT_ONLY
  ? "Content-Security-Policy-Report-Only"
  : "Content-Security-Policy";

/** The hosts product photography may come from, reused from the image allow list. */
const IMAGE_HOSTS = REMOTE_IMAGE_PATTERNS.map(
  (p) => `${p.protocol}://${p.hostname}`
);

/**
 * Where the browser uploads a product photo — see api/admin/upload/route.ts.
 *
 * This is vercel.com, not the store's own hostname, which is the guess that
 * looks right and is wrong. `@vercel/blob/client` sends both the single-shot
 * PUT and every multipart part to `getApiUrl()`, which is
 * `https://vercel.com/api/blob` unless VERCEL_BLOB_API_URL overrides it
 * (node_modules/@vercel/blob/dist/chunk-*.js). The `*.public.blob.vercel-storage.com`
 * host only ever appears in the URL that comes back, and that one is an image,
 * so it belongs in img-src — where it already is.
 */
const BLOB_UPLOAD_ORIGIN = "https://vercel.com";

export function contentSecurityPolicy(nonce: string, isDev: boolean): string {
  return [
    "default-src 'self'",

    // 'strict-dynamic' lets the nonced Next bootstrap load the chunks it needs
    // without naming each one. React uses eval in development only.
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${isDev ? " 'unsafe-eval'" : ""}`,

    // Stylesheets stay strict. Element style attributes are governed separately
    // by style-src-attr, and framer-motion animates by writing exactly those —
    // so allowing them there keeps `style-src` from having to admit inline
    // stylesheets wholesale.
    `style-src 'self' 'nonce-${nonce}'`,
    "style-src-attr 'unsafe-inline'",

    // next/image serves every photo from /_next/image (same origin); the two
    // remote hosts are listed for the unoptimized paths and for the blob store.
    `img-src 'self' data: blob: ${IMAGE_HOSTS.join(" ")}`,

    // next/font self-hosts Inter and Space Grotesk, so no Google origin here.
    "font-src 'self'",

    // /api/kerko and /api/lista are same-origin; the admin photo uploader posts
    // the file straight from the browser to the blob store.
    `connect-src 'self' ${BLOB_UPLOAD_ORIGIN}`,

    "object-src 'none'",
    "base-uri 'self'",
    // Server Actions post back to the site itself; nothing here targets a
    // third-party form endpoint.
    "form-action 'self'",
    // Agrees with X-Frame-Options: SAMEORIGIN in next.config.ts rather than
    // contradicting it.
    "frame-ancestors 'self'",
    // Browsers ignore this one in a report-only policy and log an error saying
    // so, which would bury the violations this mode exists to surface. It comes
    // back the moment the policy is enforced.
    ...(REPORT_ONLY ? [] : ["upgrade-insecure-requests"]),
  ].join("; ");
}
