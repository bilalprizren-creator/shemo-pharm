import Image from "next/image";
import { BRANDS } from "@/lib/site";
import type { Dictionary } from "@/lib/dictionaries";
import { CardSlider } from "@/components/ui/CardSlider";

/**
 * Partner-brand logos as a restrained, borderless strip: grayscale until
 * hover. No autoplay — user-driven scroll only.
 */
export function BrandStrip({ dict }: { dict: Dictionary }) {
  return (
    <section
      aria-labelledby="brendet-titulli"
      className="bg-surface"
    >
      <div className="mx-auto max-w-7xl px-4 py-12 lg:px-6 lg:py-16">
        <div className="mb-7 text-center">
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-accent-700">
            {dict.home.brandsEyebrow}
          </p>
          <h2
            id="brendet-titulli"
            className="mt-2 font-display text-xl font-bold tracking-tight text-ink-900 sm:text-2xl"
          >
            {dict.home.brandsTitle}
          </h2>
        </div>
        <CardSlider
          label={dict.home.brandsTitle}
          itemWidthClassName="w-[30%] sm:w-[20%] md:w-[15%] lg:w-[12%]"
        >
          {BRANDS.map((b) => (
            <div
              key={b.name}
              className="flex h-16 items-center justify-center px-2"
              title={b.name}
            >
              <Image
                src={b.image}
                alt={b.name}
                width={120}
                height={64}
                className="max-h-12 w-auto object-contain opacity-55 grayscale transition-all duration-200 hover:opacity-100 hover:grayscale-0"
              />
            </div>
          ))}
        </CardSlider>
      </div>
    </section>
  );
}
