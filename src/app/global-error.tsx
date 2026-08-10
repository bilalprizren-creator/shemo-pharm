"use client";

import "./globals.css";

/**
 * The last boundary. `[lang]/error.tsx` catches anything thrown inside a page,
 * but a throw in the root layout itself — a missing font, a broken provider —
 * happens above it, and without this the visitor gets the framework's bare
 * "Application error: a client-side exception has occurred".
 *
 * It replaces the whole document, so it renders its own <html> and <body> and
 * imports the stylesheet the layout would have brought. Deliberately
 * self-contained otherwise: no dictionary, no site config, no icon package.
 * Whatever failed may be exactly one of those, and Albanian is the default
 * locale, so the text is fixed rather than looked up.
 */
export default function GlobalError({ reset }: { reset: () => void }) {
  return (
    <html lang="sq">
      <body className="flex min-h-screen flex-col items-center justify-center bg-surface px-4 text-center">
        <h1 className="text-2xl font-extrabold text-ink-900 sm:text-3xl">
          Diçka shkoi keq
        </h1>
        <p className="mt-3 max-w-md text-ink-500">
          Ndodhi një gabim i papritur. Ju lutemi provoni përsëri.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <button
            type="button"
            onClick={reset}
            className="inline-flex min-h-12 items-center rounded-full bg-brand-600 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-brand-700"
          >
            Provo përsëri
          </button>
          {/* A real navigation, not next/link: the router lives in the tree
              that just failed, so a client-side transition would re-mount the
              same broken layout. A full load is the point. */}
          {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
          <a
            href="/"
            className="inline-flex min-h-12 items-center rounded-full border border-ink-900/12 bg-white px-6 py-3 text-sm font-semibold text-ink-900 transition-colors hover:border-brand-400 hover:text-brand-700"
          >
            Ballina
          </a>
        </div>
      </body>
    </html>
  );
}
