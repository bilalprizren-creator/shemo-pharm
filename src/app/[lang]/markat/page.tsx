import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { BRANDS } from "@/lib/site";
import {
  categoryDisplayName,
  getBrandLinks,
  getUnbrandedCategories,
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
    title: dict.brandsPage.title,
    description: dict.brandsPage.metaDescription,
    alternates: {
      canonical: langHref(dict.lang, "/markat"),
      languages: { sq: "/markat", en: "/en/markat" },
    },
  };
}

export default async function BrandsPage({ params }: Props) {
  const { lang } = await params;
  const dict = getDictionary(isLang(lang) ? (lang as Lang) : "sq");

  // Where each logo actually leads, resolved against the catalog rather than
  // guessed from the name — see getBrandLinks. A logo with nothing behind it
  // renders as a plain card instead of a link into an empty result page.
  const names = BRANDS.map((b) => b.name);
  const links = new Map((await getBrandLinks(names)).map((l) => [l.name, l]));
  // The brand categories no logo covers. /kategorite lists product types only,
  // so without this section they have no entry point anywhere on the site.
  const more = await getUnbrandedCategories(names);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 lg:px-6 lg:py-10">
      <Breadcrumbs items={[{ label: dict.brandsPage.title }]} dict={dict} />
      <h1 className="mt-4 text-3xl font-extrabold text-ink-900 sm:text-4xl">
        {dict.brandsPage.title}
      </h1>
      <p className="mt-2 max-w-2xl text-ink-500">{dict.brandsPage.sub}</p>

      <ul className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 lg:gap-4">
        {BRANDS.map((b) => {
          const link = links.get(b.name);
          const logo = (
            <>
              <span className="flex h-20 items-center justify-center sm:h-24">
                <Image
                  src={b.image}
                  alt={b.name}
                  width={180}
                  height={96}
                  className="max-h-20 w-auto max-w-full object-contain sm:max-h-24"
                />
              </span>
              <span className="mt-2.5 font-semibold text-ink-900">{b.name}</span>
            </>
          );
          const card =
            "flex h-full flex-col items-center rounded-xl border border-ink-900/8 bg-white p-4 text-center sm:p-5";

          return (
            <li key={b.name}>
              {link?.href ? (
                <Link
                  href={langHref(dict.lang, link.href)}
                  className={`group ${card} transition-all hover:-translate-y-0.5 hover:border-brand-300 hover:shadow-card-hover`}
                >
                  {logo}
                  <span className="mt-1.5 inline-flex items-center gap-1 text-xs font-semibold text-brand-700">
                    {fmt(dict.brandsPage.productCount, { count: link.count })}
                    <ArrowRight
                      className="size-3.5 transition-transform group-hover:translate-x-0.5"
                      aria-hidden
                    />
                  </span>
                </Link>
              ) : (
                <div className={card}>
                  {logo}
                  <span className="mt-1.5 text-xs text-ink-500">
                    {dict.brandsPage.noProducts}
                  </span>
                </div>
              )}
            </li>
          );
        })}
      </ul>

      {more.length > 0 && (
        <section className="mt-14">
          <h2 className="text-2xl font-extrabold text-ink-900">
            {dict.brandsPage.moreTitle}
          </h2>
          <p className="mt-2 max-w-2xl text-ink-500">{dict.brandsPage.moreSub}</p>
          <ul className="mt-6 flex flex-wrap gap-2.5">
            {more.map((c) => (
              <li key={c.id}>
                <Link
                  href={langHref(dict.lang, `/kategorite/${c.slug}`)}
                  className="inline-flex items-center gap-2 rounded-full border border-ink-900/8 bg-white py-2 pl-4 pr-2 font-semibold text-ink-900 transition-all hover:-translate-y-0.5 hover:border-brand-300 hover:text-brand-700 hover:shadow-card-hover"
                >
                  {categoryDisplayName(c)}
                  <span className="rounded-full bg-brand-50 px-2.5 py-0.5 text-xs font-semibold text-brand-800">
                    {c.count}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
