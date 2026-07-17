"use client";

import { useState } from "react";
import Image from "next/image";
import { Package } from "lucide-react";

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
      <div className="relative aspect-square w-full overflow-hidden rounded-2xl border border-ink-900/8 bg-white">
        {current ? (
          <Image
            src={current}
            alt={name}
            fill
            priority
            sizes="(max-width: 1024px) 92vw, 540px"
            className="object-contain p-8"
          />
        ) : (
          <div className="flex h-full items-center justify-center" aria-hidden>
            <Package className="size-20 text-ink-300" strokeWidth={1} />
          </div>
        )}
      </div>

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
                className={`relative size-18 shrink-0 overflow-hidden rounded-xl border-2 bg-white transition-colors ${
                  i === index
                    ? "border-brand-500"
                    : "border-ink-900/8 hover:border-brand-300"
                }`}
              >
                <Image
                  src={src}
                  alt=""
                  fill
                  sizes="72px"
                  className="object-contain p-1.5"
                />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
