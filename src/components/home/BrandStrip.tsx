import Image from "next/image";
import { BRANDS } from "@/lib/site";
import { CardSlider } from "@/components/ui/CardSlider";

/**
 * Distributed-brand logos as a horizontal slider: consistent sizing,
 * grayscale until hover. No autoplay — user-driven scroll only.
 */
export function BrandStrip() {
  return (
    <section
      aria-labelledby="brendet-titulli"
      className="mx-auto max-w-7xl px-4 py-14 lg:px-6 lg:py-20"
    >
      <div className="mb-8 text-center">
        <p className="text-xs font-bold uppercase tracking-[0.14em] text-accent-600">
          Partnerët tanë
        </p>
        <h2
          id="brendet-titulli"
          className="mt-2 font-display text-2xl font-bold tracking-tight text-ink-900 sm:text-3xl"
        >
          Brendet që distribuojmë
        </h2>
        <p className="mt-2 text-sm text-ink-500 sm:text-base">
          Bashkëpunojmë me brende të njohura ndërkombëtare
        </p>
      </div>
      <CardSlider
        label="Brendet që distribuojmë"
        itemWidthClassName="w-[30%] sm:w-[22%] md:w-[16%] lg:w-[13%]"
      >
        {BRANDS.map((b) => (
          <div
            key={b.name}
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
        ))}
      </CardSlider>
    </section>
  );
}
