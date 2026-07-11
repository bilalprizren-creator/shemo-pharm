"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

/**
 * Horizontal scroll-snap row with visible arrow controls on desktop.
 * Children are server-rendered product cards.
 */
export function ProductCarousel({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  const scrollerRef = useRef<HTMLUListElement>(null);
  const [canPrev, setCanPrev] = useState(false);
  const [canNext, setCanNext] = useState(false);

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

  return (
    <div className="relative" role="group" aria-label={label}>
      <ul
        ref={scrollerRef}
        className="scrollbar-none -mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-1 lg:-mx-1 lg:px-1"
      >
        {Array.isArray(children) ? (
          children.map((child, i) => (
            <li
              key={i}
              className="w-[calc(60%-0.5rem)] shrink-0 snap-start sm:w-[calc(40%-0.75rem)] md:w-[calc(33.3%-0.75rem)] lg:w-[calc(25%-0.75rem)]"
            >
              {child}
            </li>
          ))
        ) : (
          <li>{children}</li>
        )}
      </ul>

      <button
        type="button"
        onClick={() => scrollBy(-1)}
        disabled={!canPrev}
        aria-label="Produktet e mëparshme"
        className="absolute -left-3 top-[38%] z-10 hidden size-11 -translate-y-1/2 items-center justify-center rounded-full border border-ink-900/8 bg-white text-ink-700 shadow-card transition-opacity hover:bg-brand-50 hover:text-brand-700 disabled:pointer-events-none disabled:opacity-0 lg:flex"
      >
        <ChevronLeft className="size-5" aria-hidden />
      </button>
      <button
        type="button"
        onClick={() => scrollBy(1)}
        disabled={!canNext}
        aria-label="Produktet e radhës"
        className="absolute -right-3 top-[38%] z-10 hidden size-11 -translate-y-1/2 items-center justify-center rounded-full border border-ink-900/8 bg-white text-ink-700 shadow-card transition-opacity hover:bg-brand-50 hover:text-brand-700 disabled:pointer-events-none disabled:opacity-0 lg:flex"
      >
        <ChevronRight className="size-5" aria-hidden />
      </button>
    </div>
  );
}
