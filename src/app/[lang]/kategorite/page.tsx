import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Info } from "lucide-react";
import {
  categoryDisplayName,
  getCategoryTree,
  getProductCount,
} from "@/lib/catalog";
import { isLang, langHref, fmt, type Lang } from "@/lib/i18n";
import { getDictionary } from "@/lib/dictionaries";
import { Breadcrumbs } from "@/components/catalog/Breadcrumbs";

interface Props {
  params: Promise<{ lang: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { lang } = await params;
  const dict = getDictionary(isLang(lang) ? (lang as Lang) : "sq");
  return {
    title: dict.categoriesPage.title,
    description: dict.categoriesPage.metaDescription,
    alternates: {
      canonical: langHref(dict.lang, "/kategorite"),
      languages: { sq: "/kategorite", en: "/en/kategorite" },
    },
  };
}

export default async function CategoriesPage({ params }: Props) {
  const { lang } = await params;
  const dict = getDictionary(isLang(lang) ? (lang as Lang) : "sq");
  const tree = (await getCategoryTree()).filter((c) => c.count > 0);
  const total = await getProductCount();

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 lg:px-6 lg:py-10">
      <Breadcrumbs items={[{ label: dict.categoriesPage.title }]} dict={dict} />
      <h1 className="mt-4 text-3xl font-extrabold text-ink-900 sm:text-4xl">
        {dict.categoriesPage.title}
      </h1>
      <p className="mt-2 max-w-2xl text-ink-500">{dict.categoriesPage.sub}</p>

      {/* The counts on the cards are per category and correct, but adding them
          up gives 2 185 against a catalog of 2 049 — 136 products sit in two
          categories at once, which is deliberate: a children's cough syrup
          belongs on both shelves. Saying so here is cheaper than letting
          someone do the arithmetic and conclude the numbers are broken. */}
      <div className="mt-6 flex max-w-3xl items-start gap-2.5 rounded-2xl bg-tint px-4 py-3 text-sm leading-relaxed text-ink-600">
        <Info className="mt-0.5 size-4 shrink-0 text-brand-600" aria-hidden />
        <p>
          {fmt(dict.categoriesPage.overlapNote, { total })}{" "}
          <Link
            href={langHref(dict.lang, "/produktet")}
            className="font-semibold text-brand-700 underline-offset-2 hover:underline"
          >
            {fmt(dict.categoriesPage.overlapLink, { total })}
          </Link>
        </p>
      </div>

      <ul className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {tree.map((cat) => (
          <li key={cat.id}>
            <div className="flex h-full flex-col rounded-2xl border border-ink-900/8 bg-white p-5 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-card-hover">
              <div className="flex items-baseline justify-between gap-3">
                <h2 className="font-bold text-ink-900">
                  <Link
                    href={langHref(dict.lang, `/kategorite/${cat.slug}`)}
                    className="transition-colors hover:text-brand-700"
                  >
                    {categoryDisplayName(cat)}
                  </Link>
                </h2>
                <span className="shrink-0 rounded-full bg-brand-50 px-2.5 py-0.5 text-xs font-semibold text-brand-800">
                  {cat.count}
                </span>
              </div>

              {cat.children.length > 0 && (
                <ul className="mt-3 flex flex-wrap gap-1.5">
                  {cat.children
                    .filter((c) => c.count > 0)
                    .slice(0, 6)
                    .map((child) => (
                      <li key={child.id}>
                        <Link
                          href={langHref(dict.lang, `/kategorite/${child.slug}`)}
                          className="inline-block rounded-full border border-ink-900/8 px-3 py-1 text-xs text-ink-500 transition-colors hover:border-brand-300 hover:text-brand-700"
                        >
                          {categoryDisplayName(child)}
                        </Link>
                      </li>
                    ))}
                </ul>
              )}

              <Link
                href={langHref(dict.lang, `/kategorite/${cat.slug}`)}
                className="mt-auto inline-flex items-center gap-1.5 pt-4 text-sm font-semibold text-brand-700 hover:text-brand-800"
              >
                {dict.common.viewProducts}
                <ArrowRight className="size-4" aria-hidden />
              </Link>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
