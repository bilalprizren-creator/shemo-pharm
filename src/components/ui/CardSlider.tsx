"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { ChevronLeft, ChevronRight } from "lucide-react";

/**
 * Generic horizontal scroll-snap card row with arrow controls that disable
 * at the ends (ResizeObserver + scroll listener), native touch/trackpad
 * swipe, and a single fade-up reveal on the whole track (not per card —
 * revealing each card individually leaves off-screen ones stuck invisible).
 */
export function CardSlider({
  label,
  children,
  itemWidthClassName = "w-[calc(60%-0.5rem)] sm:w-[calc(40%-0.75rem)] md:w-[calc(33.3%-0.75rem)] lg:w-[calc(25%-0.75rem)]",
  className,
}: {
  label: string;
  children: React.ReactNode;
  /** Tailwind width classes applied to each slide's <li>. */
  itemWidthClassName?: string;
  className?: string;
}) {
  const scrollerRef = useRef<HTMLUListElement>(null);
  const [canPrev, setCanPrev] = useState(false);
  const [canNext, setCanNext] = useState(false);
  const reduceMotion = useReducedMotion();

  const updateArrows = useCallback(() => {
    const el = scrollerRef.current;
    if (!el) return;
    setCanPrev(el.scrollLeft > 8);
    setCanNext(el.scrollLeft + el.clientWidth < el.scrollWidth - 8);
  }, []);

  useEffect(() => {
    updateArrows();
    const el = scrollerRef.current;
    if (!el) return;
    el.addEventListener("scroll", updateArrows, { passive: true });
    const observer = new ResizeObserver(updateArrows);
    observer.observe(el);
    return () => {
      el.removeEventListener("scroll", updateArrows);
      observer.disconnect();
    };
  }, [updateArrows]);

  const scrollBy = (direction: 1 | -1) => {
    const el = scrollerRef.current;
    if (!el) return;
    el.scrollBy({ left: direction * el.clientWidth * 0.85, behavior: "smooth" });
  };

  const items = Array.isArray(children) ? children : [children];

  return (
    <div className={`relative ${className ?? ""}`} role="group" aria-label={label}>
      <motion.ul
        ref={scrollerRef}
        initial={reduceMotion ? false : { opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-80px" }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="scrollbar-none -mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-1 lg:-mx-1 lg:px-1"
      >
        {items.map((child, i) => (
          <li key={i} className={`shrink-0 snap-start ${itemWidthClassName}`}>
            {child}
          </li>
        ))}
      </motion.ul>

      <button
        type="button"
        onClick={() => scrollBy(-1)}
        disabled={!canPrev}
        aria-label="Kah e majtë"
        className="absolute -left-3 top-[38%] z-10 hidden size-11 -translate-y-1/2 items-center justify-center rounded-full border border-ink-900/8 bg-white text-ink-700 shadow-card transition-opacity hover:bg-brand-50 hover:text-brand-700 disabled:pointer-events-none disabled:opacity-0 lg:flex"
      >
        <ChevronLeft className="size-5" aria-hidden />
      </button>
      <button
        type="button"
        onClick={() => scrollBy(1)}
        disabled={!canNext}
        aria-label="Kah e djathta"
        className="absolute -right-3 top-[38%] z-10 hidden size-11 -translate-y-1/2 items-center justify-center rounded-full border border-ink-900/8 bg-white text-ink-700 shadow-card transition-opacity hover:bg-brand-50 hover:text-brand-700 disabled:pointer-events-none disabled:opacity-0 lg:flex"
      >
        <ChevronRight className="size-5" aria-hidden />
      </button>
    </div>
  );
}
