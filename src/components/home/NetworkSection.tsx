import Image from "next/image";
import { CircleCheck, MapPin, Warehouse } from "lucide-react";
import type { Dictionary } from "@/lib/dictionaries";

/**
 * "Rrjet i besueshëm për furnizim dhe shpërndarje" — communicates the physical
 * network (3 pharmacies + 2 depots) with stat chips, coverage bullets and a
 * layered pair of real warehouse photos.
 */
export function NetworkSection({ dict }: { dict: Dictionary }) {
  return (
    <section aria-labelledby="rrjeti-titulli" className="bg-white">
      <div className="mx-auto grid max-w-7xl items-center gap-10 px-4 py-14 lg:grid-cols-[0.95fr_1.05fr] lg:gap-14 lg:px-6 lg:py-20">
        <div className="max-w-lg">
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-accent-700">
            {dict.home.networkEyebrow}
          </p>
          <h2
            id="rrjeti-titulli"
            className="mt-2 font-display text-2xl font-bold leading-tight tracking-tight text-ink-900 sm:text-3xl"
          >
            {dict.home.networkTitle}
          </h2>
          <p className="mt-4 leading-relaxed text-ink-500">
            {dict.home.networkSub}
          </p>

          <div className="mt-6 flex flex-wrap gap-3">
            <div className="flex items-center gap-3 rounded-xl border border-line bg-surface-deep px-4 py-3">
              <MapPin className="size-5 text-brand-600" aria-hidden />
              <span className="leading-tight">
                <span className="font-display text-xl font-bold text-brand-700">3</span>{" "}
                <span className="text-sm font-medium text-ink-600">
                  {dict.home.networkPharmacies}
                </span>
              </span>
            </div>
            <div className="flex items-center gap-3 rounded-xl border border-line bg-surface-deep px-4 py-3">
              <Warehouse className="size-5 text-accent-600" aria-hidden />
              <span className="leading-tight">
                <span className="font-display text-xl font-bold text-brand-700">2</span>{" "}
                <span className="text-sm font-medium text-ink-600">
                  {dict.home.networkDepots}
                </span>
              </span>
            </div>
          </div>

          <ul className="mt-6 space-y-3">
            {dict.home.networkPoints.map((p) => (
              <li
                key={p}
                className="flex items-start gap-2.5 text-sm text-ink-700 sm:text-base"
              >
                <CircleCheck
                  className="mt-0.5 size-5 shrink-0 text-accent-500"
                  strokeWidth={2}
                  aria-hidden
                />
                {p}
              </li>
            ))}
          </ul>
        </div>

        <div className="relative">
          <div className="relative aspect-[4/3] overflow-hidden rounded-[1.75rem] border border-line shadow-card">
            <Image
              src="/photos/depo-distribuim.jpg"
              alt={dict.home.networkImageAlt}
              fill
              sizes="(max-width: 1024px) 92vw, 46vw"
              className="object-cover"
            />
            {/* Caption for the shelves/inventory photo — the depot, not a pharmacy. */}
            <span className="absolute bottom-3 left-3 rounded-full bg-ink-900/70 px-3 py-1 text-xs font-medium text-white backdrop-blur">
              {dict.home.networkImageAlt}
            </span>
          </div>
          <div className="absolute -bottom-6 left-4 w-40 overflow-hidden rounded-2xl border-4 border-white shadow-float sm:-left-6 sm:w-52">
            <div className="relative aspect-[4/3]">
              <Image
                src="/photos/depo.jpg"
                alt={dict.home.networkImageAlt2}
                fill
                sizes="208px"
                className="object-cover"
              />
              {/* This is a retail pharmacy interior — labelled as such, not a depot. */}
              <span className="absolute inset-x-1 bottom-1 rounded-md bg-ink-900/70 px-2 py-0.5 text-center text-[10px] font-medium text-white backdrop-blur">
                {dict.home.networkImageAlt2}
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
