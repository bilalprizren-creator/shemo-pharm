import {
  BadgeCheck,
  Building2,
  Package,
  ShieldCheck,
  Stethoscope,
  Truck,
  type LucideIcon,
} from "lucide-react";
import type { Dictionary } from "@/lib/dictionaries";

const ICONS: LucideIcon[] = [
  ShieldCheck,
  Package,
  BadgeCheck,
  Stethoscope,
  Truck,
  Building2,
];

/**
 * "Pse SHEMO Pharm?" — a refined trust grid of six value cards that spell out
 * why pharmacies, institutions and professionals partner with SHEMO.
 */
export function WhyShemo({ dict }: { dict: Dictionary }) {
  return (
    <section aria-labelledby="pse-titulli" className="bg-surface">
      <div className="mx-auto max-w-7xl px-4 py-14 lg:px-6 lg:py-20">
        <div className="mx-auto mb-10 max-w-2xl text-center">
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-accent-700">
            {dict.home.whyEyebrow}
          </p>
          <h2
            id="pse-titulli"
            className="mt-2 font-display text-2xl font-bold tracking-tight text-ink-900 sm:text-3xl"
          >
            {dict.home.whyTitle}
          </h2>
          <p className="mt-3 text-ink-500 sm:text-lg">{dict.home.whySub}</p>
        </div>

        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 lg:gap-5">
          {dict.home.whyItems.map((item, i) => {
            const Icon = ICONS[i] ?? ShieldCheck;
            return (
              <li
                key={item.title}
                className="flex h-full flex-col rounded-2xl border border-line bg-white p-6 shadow-card transition-all duration-200 hover:-translate-y-0.5 hover:shadow-card-hover"
              >
                <span
                  className={`flex size-12 items-center justify-center rounded-xl ${
                    i % 2 === 0
                      ? "bg-brand-50 text-brand-700"
                      : "bg-tint text-accent-700"
                  }`}
                >
                  <Icon className="size-6" strokeWidth={1.75} aria-hidden />
                </span>
                <h3 className="mt-4 font-bold text-ink-900">{item.title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-ink-500">
                  {item.text}
                </p>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
