"use client";

import Image from "next/image";
import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import {
  ArrowRight,
  MessageCircle,
  Package,
  Phone,
  ShieldCheck,
  Sparkles,
  Stethoscope,
} from "lucide-react";
import { SITE } from "@/lib/site";

/** Verifiable trust points shown inline under the hero CTAs. */
const TRUST_POINTS = [
  { icon: ShieldCheck, text: "Distributor i licencuar" },
  { icon: Stethoscope, text: "Këshillim profesional" },
  { icon: MessageCircle, text: "Porosi përmes WhatsApp" },
];

const fadeUp = {
  hidden: { opacity: 0, y: 18 },
  show: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.55, delay: i * 0.08, ease: "easeOut" as const },
  }),
};

/**
 * Full-bleed dark hero: warehouse photo as a faint texture layer under a
 * plum gradient, blueprint grid, glow blobs; left column with oversized
 * display headline + pill CTAs, right column with a large pharmacist
 * portrait and floating proof cards (real store photo, product count).
 */
export function Hero() {
  const reduceMotion = useReducedMotion();
  const variants = reduceMotion ? undefined : fadeUp;
  const initial = reduceMotion ? undefined : "hidden";

  return (
    <section className="relative overflow-hidden bg-plum-950">
      {/* Layer 1: moody warehouse texture, kept very dark so text stays readable */}
      <div aria-hidden className="absolute inset-0">
        <Image
          src="/photos/depo-distribuim.jpg"
          alt=""
          fill
          priority
          sizes="100vw"
          className="object-cover opacity-[0.16]"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-plum-950/85 via-plum-950/70 to-plum-950" />
      </div>
      {/* Layer 2: blueprint grid + glow blobs */}
      <div aria-hidden className="bg-grid-faint absolute inset-0" />
      <div
        aria-hidden
        className="absolute -left-24 -top-24 size-96 rounded-full bg-accent-500/25 blur-3xl"
      />
      <div
        aria-hidden
        className="absolute -right-16 top-1/3 size-80 rounded-full bg-brand-500/30 blur-3xl"
      />

      <div className="relative mx-auto grid max-w-7xl items-center gap-12 px-4 pb-24 pt-16 lg:grid-cols-[1.05fr_0.95fr] lg:gap-8 lg:px-6 lg:pb-28 lg:pt-20">
        <div>
          <motion.p
            custom={0}
            initial={initial}
            whileInView="show"
            viewport={{ once: true }}
            variants={variants}
            className="inline-flex items-center gap-2 rounded-full border border-accent-400/30 bg-accent-500/10 px-4 py-1.5 text-xs font-bold uppercase tracking-[0.14em] text-accent-300"
          >
            <Sparkles className="size-3.5" aria-hidden />
            {SITE.tagline}
          </motion.p>

          <motion.h1
            custom={1}
            initial={initial}
            whileInView="show"
            viewport={{ once: true }}
            variants={variants}
            className="mt-6 max-w-2xl font-display text-4xl font-bold leading-[1.05] tracking-tight text-white sm:text-5xl lg:text-6xl"
          >
            Shëndeti juaj,
            <br />
            <span className="text-gradient-accent">prioriteti ynë.</span>
          </motion.h1>

          <motion.p
            custom={2}
            initial={initial}
            whileInView="show"
            viewport={{ once: true }}
            variants={variants}
            className="mt-6 max-w-xl text-base leading-relaxed text-white/70 sm:text-lg"
          >
            Më shumë se 2000 produkte farmaceutike dhe medicinale të zgjedhura
            me kujdes — furnizim i besueshëm për barnatore, institucione dhe
            familje në gjithë Kosovën.
          </motion.p>

          <motion.div
            custom={3}
            initial={initial}
            whileInView="show"
            viewport={{ once: true }}
            variants={variants}
            className="mt-9 flex flex-wrap items-center gap-3"
          >
            <Link
              href="/produktet"
              className="group inline-flex min-h-12 items-center gap-2 rounded-full bg-accent-500 px-7 py-3 text-sm font-semibold text-plum-950 shadow-lg shadow-accent-500/25 transition-all hover:bg-accent-400 hover:shadow-accent-400/30"
            >
              Shiko Produktet
              <ArrowRight
                className="size-4 transition-transform group-hover:translate-x-0.5"
                aria-hidden
              />
            </Link>
            <Link
              href="/kontakti"
              className="inline-flex min-h-12 items-center gap-2 rounded-full border border-white/25 bg-white/5 px-6 py-3 text-sm font-semibold text-white backdrop-blur transition-colors hover:bg-white/10"
            >
              <Phone className="size-4" aria-hidden />
              Na Kontaktoni
            </Link>
          </motion.div>

          <motion.ul
            custom={4}
            initial={initial}
            whileInView="show"
            viewport={{ once: true }}
            variants={variants}
            className="mt-10 flex flex-wrap gap-x-8 gap-y-3"
          >
            {TRUST_POINTS.map((t) => (
              <li
                key={t.text}
                className="flex items-center gap-2 text-sm text-white/80"
              >
                <t.icon className="size-4 shrink-0 text-accent-400" aria-hidden />
                {t.text}
              </li>
            ))}
          </motion.ul>
        </div>

        {/* Portrait column with floating proof cards */}
        <motion.div
          initial={reduceMotion ? undefined : { opacity: 0, y: 28 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.65, delay: 0.15, ease: "easeOut" }}
          className="relative mx-auto hidden w-full max-w-md sm:block lg:max-w-none"
        >
          <div className="relative aspect-[4/5] overflow-hidden rounded-3xl border border-white/10 shadow-2xl shadow-black/40">
            <Image
              src="/photos/hero-farmaciste.jpg"
              alt="Farmaciste profesionale para rafteve me produkte"
              fill
              priority
              sizes="(max-width: 1024px) 28rem, 40vw"
              className="object-cover object-[center_22%]"
            />
            <div
              aria-hidden
              className="absolute inset-0 bg-gradient-to-t from-plum-950/45 via-transparent to-transparent"
            />
          </div>

          {/* Floating: real warehouse photo — authentic proof */}
          <motion.figure
            initial={reduceMotion ? undefined : { opacity: 0, y: 16, rotate: -4 }}
            whileInView={{ opacity: 1, y: 0, rotate: -3 }}
            viewport={{ once: true }}
            transition={{ duration: 0.55, delay: 0.4, ease: "easeOut" }}
            className="absolute -left-6 bottom-8 w-44 overflow-hidden rounded-2xl border border-white/15 bg-plum-900 shadow-float lg:-left-10 lg:w-52"
          >
            <div className="relative aspect-[4/3]">
              <Image
                src="/photos/depo.jpg"
                alt="Depoja e SHEMO PHARM në Prizren"
                fill
                sizes="208px"
                className="object-cover"
              />
            </div>
            <figcaption className="px-3 py-2 text-[11px] font-medium text-white/80">
              Depoja jonë në Prizren
            </figcaption>
          </motion.figure>

          {/* Floating: product-count chip */}
          <motion.div
            initial={reduceMotion ? undefined : { opacity: 0, y: -14 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.55, delay: 0.55, ease: "easeOut" }}
            className="absolute -right-3 top-8 flex items-center gap-3 rounded-2xl border border-white/15 bg-white/95 px-4 py-3 shadow-float backdrop-blur lg:-right-6"
          >
            <span className="flex size-10 items-center justify-center rounded-xl bg-brand-100 text-brand-700">
              <Package className="size-5" aria-hidden />
            </span>
            <span>
              <span className="block font-display text-lg font-bold leading-none text-ink-900">
                2000+
              </span>
              <span className="mt-0.5 block text-xs font-medium text-ink-500">
                produkte në stok
              </span>
            </span>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
