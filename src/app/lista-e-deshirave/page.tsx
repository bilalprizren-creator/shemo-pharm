import type { Metadata } from "next";
import { Breadcrumbs } from "@/components/catalog/Breadcrumbs";
import { WishlistPageClient } from "@/components/wishlist/WishlistPageClient";

export const metadata: Metadata = {
  title: "Lista e dëshirave",
  description: "Produktet që keni ruajtur në listën tuaj të dëshirave.",
  robots: { index: false },
};

export default function WishlistPage() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-8 lg:px-6 lg:py-10">
      <Breadcrumbs items={[{ label: "Lista e dëshirave" }]} />
      <h1 className="mt-4 text-3xl font-extrabold text-ink-900 sm:text-4xl">
        Lista e dëshirave
      </h1>
      <p className="mt-2 max-w-2xl text-ink-500">
        Produktet e ruajtura ruhen në pajisjen tuaj — mund t&apos;i shqyrtoni dhe
        të na kontaktoni për porosi.
      </p>
      <div className="mt-8">
        <WishlistPageClient />
      </div>
    </div>
  );
}
