import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { requireAdmin } from "@/lib/auth";
import { getAdminCategoryOptions } from "@/lib/admin-data";
import { ProductForm } from "@/components/admin/ProductForm";

export const metadata: Metadata = { title: "Produkt i ri" };

export default async function AdminNewProductPage() {
  await requireAdmin();
  const categories = await getAdminCategoryOptions();

  return (
    <div className="max-w-5xl">
      <Link
        href="/admin/produktet"
        className="inline-flex items-center gap-1.5 text-sm font-semibold text-ink-500 hover:text-ink-900"
      >
        <ArrowLeft className="size-4" aria-hidden />
        Kthehu te produktet
      </Link>
      <h1 className="mt-3 font-display text-2xl font-extrabold tracking-tight text-ink-900">
        Produkt i ri
      </h1>
      <div className="mt-6">
        <ProductForm
          categories={categories}
          values={{
            name: "",
            sku: "",
            price: "",
            regularPrice: "",
            inStock: true,
            featured: false,
            hidden: false,
            displayName: "",
            imageOverride: "",
            images: "",
            shortDescription: "",
            description: "",
            categoryIds: [],
          }}
        />
      </div>
    </div>
  );
}
