"use client";

import Image from "next/image";
import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import {
  ArrowRight,
  Package,
  Phone,
  ShieldCheck,
  Truck,
} from "lucide-react";
import { langHref } from "@/lib/i18n";
import type { Dictionary } from "@/lib/dictionaries";

const TRUST_ICONS = [ShieldCheck, Package, Truck];

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  show: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, delay: i * 0.08, ease: "easeOut" as const },
  }),
};

/**
 * Light, warm two-column hero: strong copy + CTAs on the left, the pharmacist
 * advising a mother and daughter on the right in an elegant framed card with a
 * single "licensed distributor" badge. Restrained motion, no floating collage.
 */
export function Hero({ dict }: { dict: Dictionary }) {
  const reduceMotion = useReducedMotion();
  const variants = reduceMotion ? undefined : fadeUp;
  const initial = reduceMotion ? undefined : "hidden";

  const trustPoints = [
    dict.hero.trustLicensed,
    dict.hero.trustProducts,
    dict.hero.trustSupply,
  ];

  return (
    <section className="relative overflow-hidden bg-surface">
      <div
        aria-hidden
        className="absolute inset-0 bg-[radial-gradient(42rem_26rem_at_88%_-2%,rgb(20_181_144/0.08),transparent_62%),radial-gradient(36rem_24rem_at_6%_108%,rgb(131_75_155/0.06),transparent_60%)]"
      />

      <div className="relative mx-auto grid max-w-7xl items-center gap-10 px-4 pb-14 pt-10 lg:grid-cols-[1.05fr_0.95fr] lg:gap-14 lg:px-6 lg:pb-20 lg:pt-16">
        {/* Copy column */}
        <div>
          <motion.p
            custom={0}
            initial={initial}
            whileInView="show"
            viewport={{ once: true }}
            variants={variants}
            className="flex max-w-md items-center gap-2.5 text-xs font-semibold uppercase tracking-[0.12em] text-accent-700"
          >
            <ShieldCheck className="size-4 shrink-0" aria-hidden />
            {dict.hero.eyebrow}
          </motion.p>

          <motion.h1
            custom={1}
            initial={initial}
            whileInView="show"
            viewport={{ once: true }}
            variants={variants}
            className="mt-5 max-w-2xl font-display text-[2rem] font-bold leading-[1.08] tracking-tight text-ink-900 sm:text-[2.6rem] lg:text-[3.2rem]"
          >
            {dict.hero.h1a}{" "}
            <span className="text-brand-600">{dict.hero.h1b}</span>
          </motion.h1>

          <motion.p
            custom={2}
            initial={initial}
            whileInView="show"
            viewport={{ once: true }}
            variants={variants}
            className="mt-5 max-w-xl text-base leading-relaxed text-ink-500 sm:text-lg"
          >
            {dict.hero.sub}
          </motion.p>

          <motion.div
            custom={3}
            initial={initial}
            whileInView="show"
            viewport={{ once: true }}
            variants={variants}
            className="mt-8 flex flex-wrap items-center gap-3"
          >
            <Link
              href={langHref(dict.lang, "/produktet")}
              className="group inline-flex min-h-12 items-center gap-2 rounded-full bg-brand-600 px-7 py-3 text-sm font-semibold text-white shadow-lg shadow-brand-600/20 transition-colors hover:bg-brand-700"
            >
              {dict.hero.ctaProducts}
              <ArrowRight
                className="size-4 transition-transform group-hover:translate-x-0.5"
                aria-hidden
              />
            </Link>
            <Link
              href={langHref(dict.lang, "/kontakti")}
              className="inline-flex min-h-12 items-center gap-2 rounded-full border border-ink-900/15 bg-white px-6 py-3 text-sm font-semibold text-ink-900 transition-colors hover:border-brand-300 hover:text-brand-700"
            >
              <Phone className="size-4" aria-hidden />
              {dict.hero.ctaContact}
            </Link>
          </motion.div>

          <motion.ul
            custom={4}
            initial={initial}
            whileInView="show"
            viewport={{ once: true }}
            variants={variants}
            className="mt-9 flex flex-wrap gap-x-6 gap-y-3"
          >
            {trustPoints.map((text, i) => {
              const Icon = TRUST_ICONS[i] ?? ShieldCheck;
              return (
                <li
                  key={text}
                  className="flex items-center gap-2 text-sm font-medium text-ink-700"
                >
                  <Icon className="size-4 shrink-0 text-accent-600" aria-hidden />
                  {text}
                </li>
              );
            })}
          </motion.ul>
        </div>

        {/* Photo column */}
        <motion.div
          initial={reduceMotion ? undefined : { opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.15, ease: "easeOut" }}
          className="relative"
        >
          <div className="relative aspect-[4/3] overflow-hidden rounded-[1.75rem] border border-line shadow-card-hover">
            <Image
              src="/photos/hero-barnatore.jpg"
              alt={dict.hero.imageAlt}
              fill
              priority
              sizes="(max-width: 1024px) 92vw, 46vw"
              className="object-cover"
            />
          </div>

          {/* Single licensed-distributor badge */}
          <div className="absolute -bottom-4 left-4 flex items-center gap-3 rounded-2xl border border-line bg-white/95 px-4 py-3 shadow-float backdrop-blur sm:left-6">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-accent-50 text-accent-700">
              <ShieldCheck className="size-5" aria-hidden />
            </span>
            <span className="leading-tight">
              <span className="block text-sm font-semibold text-ink-900">
                {dict.hero.trustLicensed}
              </span>
              <span className="mt-0.5 block text-xs text-ink-500">
                {dict.hero.badge}
              </span>
            </span>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
