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
  { icon: Package, text: "Mbi 2000 produkte" },
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
 * Full-bleed dark hero (echoes Jara Pharmacy's premium dark-hero formula,
 * rebuilt in SHEMO's own ink/teal/purple palette): glowing eyebrow chip,
 * oversized headline, pill CTAs, inline trust row, and the real store photo
 * as a small floating accent card rather than a half-width panel.
 */
export function Hero() {
  const reduceMotion = useReducedMotion();
  const variants = reduceMotion ? undefined : fadeUp;
  const initial = reduceMotion ? undefined : "hidden";

  return (
    <section className="relative overflow-hidden bg-plum-950">
      <div
        aria-hidden
        className="absolute -left-24 -top-24 size-96 rounded-full bg-accent-500/20 blur-3xl"
      />
      <div
        aria-hidden
        className="absolute -right-16 top-1/3 size-80 rounded-full bg-brand-500/25 blur-3xl"
      />
      <div
        aria-hidden
        className="absolute bottom-0 left-1/3 size-72 rounded-full bg-accent-500/10 blur-3xl"
      />

      <div className="relative mx-auto max-w-7xl px-4 py-16 lg:px-6 lg:py-24">
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
          className="mt-5 max-w-3xl text-4xl font-extrabold leading-[1.08] text-white sm:text-5xl lg:text-[3.75rem]"
        >
          Shëndeti juaj,
          <br />
          <span className="text-accent-400">prioriteti ynë.</span>
        </motion.h1>

        <motion.p
          custom={2}
          initial={initial}
          whileInView="show"
          viewport={{ once: true }}
          variants={variants}
          className="mt-5 max-w-xl text-base leading-relaxed text-white/70 sm:text-lg"
        >
          Më shumë se 2000 produkte farmaceutike dhe medicinale të zgjedhura
          me kujdes për mirëqenien tuaj dhe të familjes suaj.
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
            href="/produktet"
            className="inline-flex min-h-12 items-center gap-2 rounded-full bg-accent-500 px-7 py-3 text-sm font-semibold text-plum-950 shadow-lg shadow-accent-500/20 transition-colors hover:bg-accent-400"
          >
            Shiko Produktet
            <ArrowRight className="size-4" aria-hidden />
          </Link>
          <Link
            href="/kontakti"
            className="inline-flex min-h-12 items-center gap-2 rounded-full border border-white/25 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-white/10"
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
          className="mt-10 grid grid-cols-2 gap-x-6 gap-y-3 sm:flex sm:flex-wrap sm:gap-x-8"
        >
          {TRUST_POINTS.map((t) => (
            <li key={t.text} className="flex items-center gap-2 text-sm text-white/80">
              <t.icon className="size-4 shrink-0 text-accent-400" aria-hidden />
              {t.text}
            </li>
          ))}
        </motion.ul>
      </div>

      {/* Real store photo as a small floating accent card — decorative only */}
      <motion.div
        initial={reduceMotion ? undefined : { opacity: 0, y: 24, rotate: -6 }}
        whileInView={{ opacity: 1, y: 0, rotate: -3 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6, delay: 0.3, ease: "easeOut" }}
        className="pointer-events-none absolute right-10 top-1/2 hidden w-64 -translate-y-1/2 overflow-hidden rounded-2xl border border-white/10 shadow-2xl shadow-black/40 xl:block"
        aria-hidden
      >
        <div className="relative aspect-[4/3]">
          <Image
            src="/photos/depo.jpg"
            alt=""
            fill
            sizes="256px"
            className="object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-plum-950/50 via-transparent to-transparent" />
        </div>
      </motion.div>
    </section>
  );
}
