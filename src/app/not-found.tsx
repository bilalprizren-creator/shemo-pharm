import Link from "next/link";
import { PackageSearch } from "lucide-react";

export default function NotFound() {
  return (
    <div className="mx-auto flex min-h-[55vh] max-w-md flex-col items-center justify-center px-4 py-16 text-center">
      <span className="flex size-20 items-center justify-center rounded-full bg-brand-50">
        <PackageSearch className="size-9 text-brand-600" strokeWidth={1.5} aria-hidden />
      </span>
      <p className="mt-6 text-sm font-semibold uppercase tracking-wider text-brand-700">
        Gabim 404
      </p>
      <h1 className="mt-2 text-2xl font-extrabold text-ink-900 sm:text-3xl">
        Faqja nuk u gjet
      </h1>
      <p className="mt-3 text-ink-500">
        Faqja që kërkuat mund të jetë zhvendosur ose nuk ekziston më.
      </p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Link
          href="/"
          className="inline-flex min-h-12 items-center rounded-full bg-brand-600 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-brand-700"
        >
          Kthehu në ballinë
        </Link>
        <Link
          href="/produktet"
          className="inline-flex min-h-12 items-center rounded-full border border-ink-900/12 bg-white px-6 py-3 text-sm font-semibold text-ink-900 transition-colors hover:border-brand-400 hover:text-brand-700"
        >
          Shfleto produktet
        </Link>
      </div>
    </div>
  );
}
