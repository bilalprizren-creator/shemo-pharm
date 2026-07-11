import Image from "next/image";
import Link from "next/link";
import { ArrowRight, BookOpen, Phone } from "lucide-react";
import { SITE } from "@/lib/site";

export interface HeroProduct {
  name: string;
  slug: string;
  image: string;
}

/**
 * Static split hero — deliberately no carousel. The right side is a
 * composition of real products from the catalog on soft brand-tinted shapes.
 */
export function Hero({ products }: { products: HeroProduct[] }) {
  const [main, second, third] = products;

  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-mint via-white to-lavender">
      <div className="mx-auto grid max-w-7xl items-center gap-10 px-4 py-12 lg:grid-cols-[1.1fr_1fr] lg:gap-8 lg:px-6 lg:py-20">
        <div className="max-w-xl">
          <p className="inline-flex items-center rounded-full border border-brand-200 bg-brand-50 px-3.5 py-1.5 text-xs font-semibold tracking-wide text-brand-800">
            Shëndet, cilësi dhe besueshmëri
          </p>
          <h1 className="mt-5 text-4xl font-extrabold leading-[1.08] text-ink-900 sm:text-5xl lg:text-[3.4rem]">
            Partneri juaj i besueshëm për{" "}
            <span className="text-brand-600">produkte</span> dhe{" "}
            <span className="text-accent-600">pajisje mjekësore</span>
          </h1>
          <p className="mt-5 text-base leading-relaxed text-ink-500 sm:text-lg">
            SHEMO PHARM është depo farmaceutike dhe distributor me shumicë që
            furnizon barnatore dhe partnerë profesionalë me produkte të
            përzgjedhura nga brende të njohura.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Link
              href="/produktet"
              className="inline-flex min-h-12 items-center gap-2 rounded-full bg-brand-600 px-6 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-brand-700"
            >
              Shfleto produktet
              <ArrowRight className="size-4" aria-hidden />
            </Link>
            <Link
              href="/kontakti"
              className="inline-flex min-h-12 items-center gap-2 rounded-full border border-ink-900/12 bg-white px-6 py-3 text-sm font-semibold text-ink-900 transition-colors hover:border-brand-400 hover:text-brand-700"
            >
              <Phone className="size-4 text-brand-600" aria-hidden />
              Na kontaktoni
            </Link>
            {SITE.catalogUrl && (
              <a
                href={SITE.catalogUrl}
                className="inline-flex min-h-12 items-center gap-2 px-2 py-3 text-sm font-semibold text-accent-700 hover:text-accent-800"
              >
                <BookOpen className="size-4" aria-hidden />
                Shkarko katalogun
              </a>
            )}
          </div>
        </div>

        {main && (
          <div className="relative mx-auto hidden w-full max-w-md sm:block lg:max-w-none">
            <div
              aria-hidden
              className="absolute -right-10 -top-12 size-64 rounded-full bg-accent-100/70 blur-2xl lg:size-80"
            />
            <div
              aria-hidden
              className="absolute -bottom-14 -left-8 size-56 rounded-full bg-brand-100 blur-2xl lg:size-72"
            />
            <div className="relative grid grid-cols-5 grid-rows-6 gap-4" style={{ minHeight: 420 }}>
              <Link
                href={`/produktet/${main.slug}`}
                className="group col-span-3 col-start-1 row-span-6 flex flex-col rounded-3xl border border-ink-900/6 bg-white/80 p-6 shadow-card backdrop-blur transition-shadow hover:shadow-card-hover"
              >
                <div className="relative flex-1">
                  <Image
                    src={main.image}
                    alt={main.name}
                    fill
                    priority
                    sizes="(max-width: 1024px) 45vw, 340px"
                    className="object-contain transition-transform duration-300 group-hover:scale-[1.03]"
                  />
                </div>
                <p className="mt-4 line-clamp-1 text-center text-sm font-semibold text-ink-700">
                  {main.name}
                </p>
              </Link>
              {second && (
                <Link
                  href={`/produktet/${second.slug}`}
                  className="group col-span-2 col-start-4 row-span-3 flex flex-col rounded-3xl border border-ink-900/6 bg-white/80 p-4 shadow-card backdrop-blur transition-shadow hover:shadow-card-hover"
                >
                  <div className="relative flex-1">
                    <Image
                      src={second.image}
                      alt={second.name}
                      fill
                      sizes="180px"
                      className="object-contain transition-transform duration-300 group-hover:scale-[1.04]"
                    />
                  </div>
                  <p className="mt-2 line-clamp-1 text-center text-xs font-medium text-ink-500">
                    {second.name}
                  </p>
                </Link>
              )}
              {third && (
                <Link
                  href={`/produktet/${third.slug}`}
                  className="group col-span-2 col-start-4 row-span-3 flex flex-col rounded-3xl border border-ink-900/6 bg-white/80 p-4 shadow-card backdrop-blur transition-shadow hover:shadow-card-hover"
                >
                  <div className="relative flex-1">
                    <Image
                      src={third.image}
                      alt={third.name}
                      fill
                      sizes="180px"
                      className="object-contain transition-transform duration-300 group-hover:scale-[1.04]"
                    />
                  </div>
                  <p className="mt-2 line-clamp-1 text-center text-xs font-medium text-ink-500">
                    {third.name}
                  </p>
                </Link>
              )}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
