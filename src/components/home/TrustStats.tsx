import {
  Building2,
  Handshake,
  Package,
  Users,
  Warehouse,
  type LucideIcon,
} from "lucide-react";
import { SITE } from "@/lib/site";
import type { Dictionary } from "@/lib/dictionaries";

/** One small, consistent icon per company figure (order matches SITE.stats). */
const STAT_ICONS: LucideIcon[] = [Users, Package, Handshake, Building2, Warehouse];

/**
 * Compact company-figures band — a restrained white strip with hairline
 * dividers and one small icon per figure. Five discrete stats (never "3 + 2").
 * Used on the homepage right under <Hero /> and standalone on /rreth-nesh.
 */
export function TrustStats({ dict }: { dict: Dictionary }) {
  return (
    <section aria-label={dict.stats.label} className="border-y border-line bg-white">
      <dl className="mx-auto grid max-w-7xl grid-cols-2 divide-line sm:grid-cols-5 sm:divide-x">
        {SITE.stats.map((s, i) => {
          const Icon = STAT_ICONS[i] ?? Package;
          return (
            <div
              key={s.label}
              className="flex flex-col items-center gap-1 px-4 py-5 text-center max-sm:last:col-span-2 lg:py-6"
            >
              <Icon
                className="order-1 size-5 text-accent-600"
                strokeWidth={1.75}
                aria-hidden
              />
              <dd className="order-2 font-display text-2xl font-bold tracking-tight text-brand-700 sm:text-3xl">
                {s.value}
              </dd>
              <dt className="order-3 text-sm font-medium text-ink-500">
                {dict.stats.labels[i] ?? s.label}
              </dt>
            </div>
          );
        })}
      </dl>
    </section>
  );
}
