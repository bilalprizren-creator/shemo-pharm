"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { thumbnailFor } from "@/lib/images";
import { Package } from "lucide-react";
import { PhotoWell, PHOTO_SHADOW_SM, photoPresentation } from "./PhotoWell";

export function ProductGallery({
  images,
  name,
  labels,
}: {
  images: string[];
  name: string;
  /** Localized list label + "{i} of {total}" template. */
  labels: { list: string; image: string };
}) {
  const [index, setIndex] = useState(0);
  const current = images[index] ?? images[0];
  const listRef = useRef<HTMLUListElement>(null);

  const position = (i: number) =>
    labels.image.replace("{i}", String(i + 1)).replace("{total}", String(images.length));

  /**
   * Left/Right (and Home/End) move between the thumbnails.
   *
   * A strip of buttons is a set of related controls, and the arrow keys are how
   * one is expected to move through those — Tab through eight thumbnails to
   * reach the page's next control is the alternative. Focus moves with the
   * selection so what is shown and what is focused never disagree.
   */
  const onKeyDown = (e: React.KeyboardEvent<HTMLUListElement>) => {
    const step =
      e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0;
    let next = index;
    if (step !== 0) next = (index + step + images.length) % images.length;
    else if (e.key === "Home") next = 0;
    else if (e.key === "End") next = images.length - 1;
    else return;

    e.preventDefault();
    setIndex(next);
    listRef.current?.querySelectorAll("button")[next]?.focus();
  };

  return (
    <div>
      {/* Per image, not per product: a gallery can mix a cut-out packshot with
          an uncut detail photo, and each needs its own ground. */}
      <PhotoWell
        className="aspect-square w-full overflow-hidden rounded-2xl border border-ink-900/8"
        cutOut={photoPresentation(current, { pad: "p-8" }).cutOut}
      >
        {current ? (
          <Image
            src={current}
            /* Named by position as well as product, or every image in the strip
               carries the same alt text and switching one for another announces
               nothing at all. */
            alt={images.length > 1 ? `${name} — ${position(index)}` : name}
            fill
            priority
            sizes="(max-width: 1024px) 92vw, 540px"
            quality={85}
            className={photoPresentation(current, { pad: "p-8" }).className}
          />
        ) : (
          <div className="flex h-full items-center justify-center" aria-hidden>
            <Package className="size-20 text-ink-300" strokeWidth={1} />
          </div>
        )}
      </PhotoWell>

      {images.length > 1 && (
        <>
          {/* The alt text above changes with the picture, but a changed alt on
              an element that was already there is not announced — this is. */}
          <p className="sr-only" aria-live="polite">
            {position(index)}
          </p>
          <ul
            ref={listRef}
            onKeyDown={onKeyDown}
            className="mt-3 flex gap-2.5 overflow-x-auto pb-1"
            aria-label={labels.list}
          >
            {images.map((src, i) => (
              <li key={src}>
                <button
                  type="button"
                  onClick={() => setIndex(i)}
                  aria-label={position(i)}
                  aria-current={i === index}
                  className="relative block"
                >
                  {/* The same well as the big view above rather than a hand-copied
                      gradient, which is how the two drifted apart before. */}
                  <PhotoWell
                    className={`size-18 shrink-0 overflow-hidden rounded-xl border-2 transition-colors ${
                      i === index
                        ? "border-brand-500"
                        : "border-ink-900/8 hover:border-brand-300"
                    }`}
                    cutOut={photoPresentation(src, { pad: "p-1.5", shadow: PHOTO_SHADOW_SM }).cutOut}
                  >
                    <Image
                      src={thumbnailFor(src)}
                      alt=""
                      fill
                      sizes="72px"
                      className={
                        photoPresentation(src, { pad: "p-1.5", shadow: PHOTO_SHADOW_SM }).className
                      }
                    />
                  </PhotoWell>
                </button>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
