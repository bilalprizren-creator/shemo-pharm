import type { Metadata } from "next";
import { isLang, type Lang } from "@/lib/i18n";
import { getDictionary } from "@/lib/dictionaries";
import { Breadcrumbs } from "@/components/catalog/Breadcrumbs";
import { WishlistPageClient } from "@/components/wishlist/WishlistPageClient";

interface Props {
  params: Promise<{ lang: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { lang } = await params;
  const dict = getDictionary(isLang(lang) ? (lang as Lang) : "sq");
  return {
    title: dict.wishlistPage.title,
    description: dict.wishlistPage.metaDescription,
    robots: { index: false },
  };
}

export default async function WishlistPage({ params }: Props) {
  const { lang } = await params;
  const dict = getDictionary(isLang(lang) ? (lang as Lang) : "sq");
  return (
    <div className="mx-auto max-w-7xl px-4 py-8 lg:px-6 lg:py-10">
      <Breadcrumbs items={[{ label: dict.wishlistPage.title }]} dict={dict} />
      <h1 className="mt-4 text-3xl font-extrabold text-ink-900 sm:text-4xl">
        {dict.wishlistPage.title}
      </h1>
      <p className="mt-2 max-w-2xl text-ink-500">{dict.wishlistPage.sub}</p>
      <div className="mt-8">
        <WishlistPageClient dict={dict} />
      </div>
    </div>
  );
}
