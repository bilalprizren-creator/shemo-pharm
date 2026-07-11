import Image from "next/image";
import { BRANDS } from "@/lib/site";

/**
 * Distributed-brand logos: consistent sizing, grayscale until hover.
 * A static wrapped grid — no autoplay, nothing moves.
 */
export function BrandStrip() {
  return (
    <section
      aria-labelledby="brendet-titulli"
      className="mx-auto max-w-7xl px-4 py-14 lg:px-6 lg:py-20"
    >
      <div className="mb-8 text-center">
        <h2 id="brendet-titulli" className="text-2xl font-extrabold text-ink-900 sm:text-3xl">
          Brendet që distribuojmë
        </h2>
        <p className="mt-2 text-sm text-ink-500 sm:text-base">
          Bashkëpunojmë me brende të njohura ndërkombëtare
        </p>
      </div>
      <ul className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-7">
        {BRANDS.map((b) => (
          <li key={b.name}>
            <div
              className="group flex h-20 items-center justify-center rounded-xl border border-ink-900/6 bg-white p-3 transition-colors hover:border-brand-200"
              title={b.name}
            >
              <Image
                src={b.image}
                alt={b.name}
                width={120}
                height={72}
                className="max-h-14 w-auto object-contain opacity-60 grayscale transition-all duration-200 group-hover:opacity-100 group-hover:grayscale-0"
              />
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
