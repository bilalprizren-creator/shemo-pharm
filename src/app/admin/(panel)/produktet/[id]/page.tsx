import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { requireAdmin } from "@/lib/auth";
import { getAdminCategoryOptions, getAdminProduct } from "@/lib/admin-data";
import { ProductForm } from "@/components/admin/ProductForm";
import { DeleteProductButton } from "@/components/admin/DeleteProductButton";

export const metadata: Metadata = { title: "Ndrysho produktin" };

function euros(cents: number): string {
  return (cents / 100).toFixed(2);
}

export default async function AdminEditProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdmin();
  const { id } = await params;
  const productId = Number(id);
  if (!Number.isInteger(productId)) notFound();

  const [product, categories] = await Promise.all([
    getAdminProduct(productId),
    getAdminCategoryOptions(),
  ]);
  if (!product) notFound();

  return (
    <div className="max-w-5xl">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          href="/admin/produktet"
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-ink-500 hover:text-ink-900"
        >
          <ArrowLeft className="size-4" aria-hidden />
          Kthehu te produktet
        </Link>
        <a
          href={`/produktet/${product.slug}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand-700 hover:text-brand-800"
        >
          <ExternalLink className="size-4" aria-hidden />
          Shiko në faqe
        </a>
      </div>

      <h1 className="mt-3 font-display text-2xl font-extrabold tracking-tight text-ink-900">
        {product.name}
      </h1>

      <div className="mt-6">
        <ProductForm
          categories={categories}
          values={{
            id: product.id,
            name: product.name,
            sku: product.sku,
            price: euros(product.priceCents),
            regularPrice: euros(product.regularCents),
            inStock: product.inStock,
            featured: product.featured,
            hidden: product.hidden,
            displayName: product.displayName ?? "",
            imageOverride: product.imageOverride ?? "",
            images: product.images.join("\n"),
            shortDescription: product.shortDescription,
            description: product.description,
            categoryIds: product.categoryIds,
          }}
        />
      </div>

      <div className="mt-8 rounded-2xl border border-red-200 bg-white p-5">
        <h2 className="text-sm font-bold text-red-800">Zonë e rrezikshme</h2>
        <p className="mt-1 text-sm text-ink-500">
          Fshirja e produktit është e përhershme dhe nuk mund të kthehet.
        </p>
        <div className="mt-3">
          <DeleteProductButton id={product.id} />
        </div>
      </div>
    </div>
  );
}
