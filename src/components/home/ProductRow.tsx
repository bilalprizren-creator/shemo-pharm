import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { ProductCard } from "@/components/product/ProductCard";
import { ProductCarousel } from "@/components/product/ProductCarousel";
import type { CardProduct } from "@/lib/types";

export function ProductRow({
  title,
  subtitle,
  href,
  products,
  tinted = false,
}: {
  title: string;
  subtitle?: string;
  href: string;
  products: CardProduct[];
  tinted?: boolean;
}) {
  if (products.length === 0) return null;

  return (
    <section
      aria-label={title}
      className={tinted ? "bg-lavender/60" : undefined}
    >
      <div className="mx-auto max-w-7xl px-4 py-12 lg:px-6 lg:py-16">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-2xl font-extrabold text-ink-900 sm:text-3xl">{title}</h2>
            {subtitle && <p className="mt-1.5 text-sm text-ink-500 sm:text-base">{subtitle}</p>}
          </div>
          <Link
            href={href}
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand-700 hover:text-brand-800"
          >
            Shiko të gjitha
            <ArrowRight className="size-4" aria-hidden />
          </Link>
        </div>
        <ProductCarousel label={title}>
          {products.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </ProductCarousel>
      </div>
    </section>
  );
}
