"use client";

import { useState } from "react";
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
            alt={name}
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
        <ul className="mt-3 flex gap-2.5 overflow-x-auto pb-1" aria-label={labels.list}>
          {images.map((src, i) => (
            <li key={src}>
              <button
                type="button"
                onClick={() => setIndex(i)}
                aria-label={labels.image
                  .replace("{i}", String(i + 1))
                  .replace("{total}", String(images.length))}
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
      )}
    </div>
  );
}
