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
 * directive that is one host short is a blank page for a real customer.
 *
 * Flipping REPORT_ONLY to false needs evidence, not a hunch, which is why the
 * policy now names a collector — violations used to exist only in whichever
 * browser console happened to be open. What has to be true first:
 *
 *   1. a *production* build. The dev policy allows 'unsafe-eval' and dev emits
 *      inline scripts production does not, so a walkthrough of `next dev`
 *      proves nothing about the header customers get;
 *   2. no violations reported across both locales — homepage, a filtered
 *      listing, a product page (JSON-LD and gallery), the cart drawer with a
 *      framer-motion animation actually running, the contact form, the search
 *      bar, register/login/verify/reset, and every admin page including a real
 *      photo upload;
 *   3. Next's own script tags visibly carrying nonce= in view-source, which is
 *      the handshake tests/csp.test.ts can only partly stand in for.
 *
 * Point 2 currently cannot be completed: the blob store's billing is inactive,
 * so an upload cannot get far enough to prove the admin form's request path.
 * Until that is resolved this stays true.
 */
export const REPORT_ONLY = true;

export const CSP_HEADER = REPORT_ONLY
  ? "Content-Security-Policy-Report-Only"
  : "Content-Security-Policy";

/** Where violations are collected. See src/app/api/csp-report/route.ts. */
export const CSP_REPORT_PATH = "/api/csp-report";

/** The name the report-to directive and the Reporting-Endpoints header share. */
const CSP_REPORT_GROUP = "csp-endpoint";

/** The response header that gives `report-to` a destination to resolve. */
export const REPORTING_ENDPOINTS_HEADER = "Reporting-Endpoints";
export const REPORTING_ENDPOINTS_VALUE = `${CSP_REPORT_GROUP}="${CSP_REPORT_PATH}"`;

/** The hosts product photography may come from, reused from the image allow list. */
const IMAGE_HOSTS = REMOTE_IMAGE_PATTERNS.map(
  (p) => `${p.protocol}://${p.hostname}`
);

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

    // Nothing off-origin. This used to name vercel.com, because the admin photo
    // uploader posted the file from the browser straight to the blob API — the
    // upload goes through /api/admin/upload now, so the browser has no reason to
    // talk to anybody but us, and the allowance is gone.
    "connect-src 'self'",

    "object-src 'none'",
    "base-uri 'self'",
    // Server Actions post back to the site itself; nothing here targets a
    // third-party form endpoint.
    "form-action 'self'",
    // Agrees with X-Frame-Options: SAMEORIGIN in next.config.ts rather than
    // contradicting it.
    "frame-ancestors 'self'",

    // Both spellings on purpose: report-to is the current mechanism and needs
    // the Reporting-Endpoints header to resolve the group name, report-uri is
    // deprecated and is still what several browsers actually act on.
    `report-uri ${CSP_REPORT_PATH}`,
    `report-to ${CSP_REPORT_GROUP}`,

    // Browsers ignore this one in a report-only policy and log an error saying
    // so, which would bury the violations this mode exists to surface. It comes
    // back the moment the policy is enforced.
    ...(REPORT_ONLY ? [] : ["upgrade-insecure-requests"]),
  ].join("; ");
}
