import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { BRANDS } from "@/lib/site";
import { getCategoryBySlug } from "@/lib/catalog";
import { Breadcrumbs } from "@/components/catalog/Breadcrumbs";

export const metadata: Metadata = {
  title: "Markat",
  description:
    "Brendet ndërkombëtare që distribuon SHEMO PHARM: Swiss Energy, Dr. Frei, Kräuterhof, Cansin, Sudocrem dhe shumë të tjera.",
  alternates: { canonical: "/markat" },
};

/** Brands that have their own category in the catalog link straight to it. */
const BRAND_CATEGORY: Record<string, string> = {
  Cansin: "cansin",
  "Kräuterhof": "krauterhof",
  "ATC Natyral": "atc-natyral",
  "Swiss Energy": "swiss-energy",
};

function brandHref(name: string): string {
  const slug = BRAND_CATEGORY[name];
  if (slug && getCategoryBySlug(slug)) return `/kategorite/${slug}`;
  return `/produktet?kerko=${encodeURIComponent(name.split(" ")[0])}`;
}

export default function BrandsPage() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-8 lg:px-6 lg:py-10">
      <Breadcrumbs items={[{ label: "Markat" }]} />
      <h1 className="mt-4 text-3xl font-extrabold text-ink-900 sm:text-4xl">
        Markat
      </h1>
      <p className="mt-2 max-w-2xl text-ink-500">
        Bashkëpunojmë me brende të njohura ndërkombëtare për t&apos;u ofruar
        barnatoreve dhe partnerëve produkte me cilësi të verifikuar.
      </p>

      <ul className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 lg:gap-4">
        {BRANDS.map((b) => (
          <li key={b.name}>
            <Link
              href={brandHref(b.name)}
              className="group flex h-full flex-col items-center rounded-xl border border-ink-900/8 bg-white p-6 text-center transition-all hover:-translate-y-0.5 hover:border-brand-300 hover:shadow-card-hover"
            >
              <span className="flex h-20 items-center justify-center">
                <Image
                  src={b.image}
                  alt={b.name}
                  width={140}
                  height={84}
                  className="max-h-16 w-auto object-contain opacity-75 grayscale transition-all duration-200 group-hover:opacity-100 group-hover:grayscale-0"
                />
              </span>
              <span className="mt-3 font-semibold text-ink-900">{b.name}</span>
              <span className="mt-1.5 inline-flex items-center gap-1 text-xs font-semibold text-brand-700 opacity-0 transition-opacity group-hover:opacity-100">
                Shiko produktet
                <ArrowRight className="size-3.5" aria-hidden />
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
