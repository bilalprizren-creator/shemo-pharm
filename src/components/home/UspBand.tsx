import {
  BadgeCheck,
  Handshake,
  MessageCircle,
  Package,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import type { Dictionary } from "@/lib/dictionaries";
import { CardSlider } from "@/components/ui/CardSlider";

const USP_ICONS = [
  ShieldCheck,
  BadgeCheck,
  UserRound,
  Package,
  Handshake,
  MessageCircle,
];

/** "Pse SHEMO PHARM" trust slider — pastel icon discs, alternating tints. */
export function UspBand({ dict }: { dict: Dictionary }) {
  const items = dict.home.usp.map((item, i) => ({
    ...item,
    icon: USP_ICONS[i] ?? ShieldCheck,
  }));

  return (
    <section aria-labelledby="pse-shemo-titulli" className="bg-surface">
      <div className="mx-auto max-w-7xl px-4 py-14 lg:px-6 lg:py-20">
        <div className="mb-8 max-w-xl">
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-accent-600">
            {dict.home.uspEyebrow}
          </p>
          <h2
            id="pse-shemo-titulli"
            className="mt-2 font-display text-2xl font-bold tracking-tight text-ink-900 sm:text-3xl"
          >
            {dict.home.uspTitle}
          </h2>
          <p className="mt-2 text-sm text-ink-500 sm:text-base">
            {dict.home.uspSub}
          </p>
        </div>

        <CardSlider
          label={dict.home.uspLabel}
          itemWidthClassName="w-[68%] sm:w-[42%] md:w-[30%] lg:w-[22%]"
        >
          {items.map((item, i) => (
            <div
              key={item.title}
              className="group flex h-full flex-col rounded-2xl border border-ink-900/6 bg-white p-5 transition-all duration-200 hover:-translate-y-1 hover:shadow-card-hover"
            >
              <span
                className={`flex size-12 items-center justify-center rounded-xl transition-transform duration-200 group-hover:scale-105 ${
                  i % 2 === 0
                    ? "bg-gradient-to-br from-accent-50 to-accent-100 text-accent-700"
                    : "bg-gradient-to-br from-brand-50 to-brand-100 text-brand-700"
                }`}
              >
                <item.icon className="size-5.5" strokeWidth={1.75} aria-hidden />
              </span>
              <h3 className="mt-3.5 font-bold text-ink-900">{item.title}</h3>
              <p className="mt-1 text-sm leading-snug text-ink-500">{item.text}</p>
            </div>
          ))}
        </CardSlider>
      </div>
    </section>
  );
}
