import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  BookOpen,
  BookX,
  ExternalLink,
  EyeOff,
  ListOrdered,
  Plus,
  Search,
  X,
} from "lucide-react";
import { requireAdmin } from "@/lib/auth";
import {
  getAdminCatalogSection,
  getAdminCatalogSectionOptions,
  searchProductsToPlace,
} from "@/lib/admin-data";
import {
  moveCatalogProductAction,
  placeProductInCatalogAction,
  renumberCatalogSectionAction,
  toggleProductFlagAction,
} from "@/lib/admin-actions";
import {
  NO_PRODUCT_FILTER,
  productFilterFields,
} from "@/lib/product-filter";
import {
  ProductBulkBar,
  ProductSelectAll,
} from "@/components/admin/ProductBulkBar";

export const metadata: Metadata = { title: "Seksioni i katalogut" };

/** Ties the row checkboxes to the bulk form they are not nested inside. */
const BULK_FORM = "bulk-section";

const iconButton =
  "inline-flex size-8 items-center justify-center rounded-full text-ink-400 transition-colors hover:bg-tint hover:text-ink-900 disabled:opacity-40";

/**
 * One printed section: what is in it, in what order, and how to change both.
 *
 * The order here is the order the paper edition runs in, so it is edited a step
 * at a time rather than typed as numbers — `catalog_sort` arrived from the
 * import with duplicates in it, and a table of hand-typed positions is exactly
 * how it got them. The number field on the product form is still there for the
 * rare case of placing something at a known position.
 */
export default async function AdminCatalogSectionPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ shto?: string }>;
}) {
  await requireAdmin();
  const { id } = await params;
  const sectionId = Number(id);
  if (!Number.isInteger(sectionId)) notFound();

  const [section, sectionOptions] = await Promise.all([
    getAdminCatalogSection(sectionId),
    getAdminCatalogSectionOptions(),
  ]);
  if (!section) notFound();

  const sp = await searchParams;
  const query = sp.shto?.trim() ?? "";
  const candidates = query ? await searchProductsToPlace(sectionId, query) : [];

  // Products come back ordered by (catalog_sort, id), so equal neighbours are
  // the products whose printed order is decided by their id rather than by
  // anyone — the one thing renumbering actually fixes. The import left the
  // positions 0-based, which is untidy but unambiguous, and a button offered on
  // every section for that would be noise.
  const tied = section.products.filter(
    (p, i) => i > 0 && p.catalogSort === section.products[i - 1]!.catalogSort
  ).length;
  const last = section.products.length - 1;

  return (
    <div className="max-w-5xl">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          href="/admin/katalogu"
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-ink-500 hover:text-ink-900"
        >
          <ArrowLeft className="size-4" aria-hidden />
          Kthehu te katalogu
        </Link>
        <a
          href={`/katalog/${section.slug}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand-700 hover:text-brand-800"
        >
          <ExternalLink className="size-4" aria-hidden />
          Shiko në faqe
        </a>
      </div>

      <h1 className="mt-3 font-display text-2xl font-extrabold tracking-tight text-ink-900">
        {section.catalogNo} {section.name}
      </h1>
      <p className="mt-1 text-sm text-ink-500">
        {section.productCount} produkte · {section.visibleCount} shtypen
        {section.shopHiddenCount > 0 &&
          ` · ${section.shopHiddenCount} jashtë dyqanit`}{" "}
        · renditja {section.sort} ·{" "}
        <span className="font-mono text-[13px]">/{section.slug}</span>
      </p>

      {section.visibleCount === 0 && (
        <p className="mt-4 rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Ky seksion nuk shfaqet në katalog: asnjë produkt i tij nuk shtypet.
          {section.productCount > 0
            ? " Kthejini në katalog me butonin te kolona «Shtypet», ose shtoni produkte më poshtë."
            : " Shtojini produkte më poshtë ose hiqni seksionin te lista."}
        </p>
      )}

      <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-lg font-bold text-ink-900">
            Rendi i shtypur
          </h2>
          {tied > 0 && (
            <p className="mt-0.5 text-sm text-ink-500">
              {tied} produkte ndajnë pozicionin me atë para tyre — rendi i tyre
              vendoset nga ID-ja, jo nga ju.
            </p>
          )}
        </div>
        {tied > 0 && (
          <form action={renumberCatalogSectionAction}>
            <input type="hidden" name="sectionId" value={section.id} />
            <button
              type="submit"
              title="Shkruaj pozicionet si 1, 2, 3 … pa ndryshuar rendin e tanishëm"
              className="inline-flex items-center gap-1.5 rounded-full border border-ink-900/10 bg-white px-4 py-2 text-sm font-semibold text-ink-700 transition-colors hover:border-brand-300 hover:text-ink-900"
            >
              <ListOrdered className="size-4" aria-hidden />
              Rinumëro
            </button>
          </form>
        )}
      </div>

      <div className="mt-3 overflow-x-auto rounded-2xl border border-ink-900/8 bg-white">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead>
            <tr className="border-b border-ink-900/8 text-xs uppercase tracking-wide text-ink-400">
              <th className="w-10 py-3 pl-4 pr-1">
                <ProductSelectAll
                  formId={BULK_FORM}
                  pageCount={section.products.length}
                />
              </th>
              <th className="px-4 py-3 font-semibold">#</th>
              <th className="px-4 py-3 font-semibold">Produkti</th>
              <th className="px-4 py-3 font-semibold">Kodi</th>
              <th className="px-4 py-3 font-semibold">Pozicioni</th>
              <th className="px-4 py-3 font-semibold text-center">Shtypet</th>
              <th className="px-4 py-3 font-semibold text-center">Lëviz</th>
              <th className="px-4 py-3 font-semibold text-right">Hiq</th>
            </tr>
          </thead>
          <tbody>
            {section.products.map((p, i) => (
              <tr
                key={p.id}
                className={`border-b border-ink-900/4 last:border-0 ${
                  p.catalogHidden ? "opacity-55" : ""
                }`}
              >
                {/* Associated with the bulk form by id rather than nested in
                    it: every other cell in this row holds a form of its own,
                    and a form inside a form is not something HTML has. */}
                <td className="w-10 py-2.5 pl-4 pr-1">
                  <input
                    type="checkbox"
                    name="ids"
                    value={p.id}
                    form={BULK_FORM}
                    aria-label={`Zgjidh ${p.name}`}
                    className="size-4 cursor-pointer rounded border-ink-900/25 text-brand-600 focus:ring-brand-500/40"
                  />
                </td>
                <td className="px-4 py-2.5 tabular-nums text-ink-400">{i + 1}</td>
                <td className="max-w-[320px] px-4 py-2.5">
                  <Link
                    href={`/admin/produktet/${p.id}`}
                    className="block truncate font-medium text-ink-900 hover:text-brand-700"
                    title={p.name}
                  >
                    {p.name}
                  </Link>
                  {p.hidden && (
                    <span className="inline-flex items-center gap-1 text-xs text-ink-400">
                      <EyeOff className="size-3" aria-hidden />
                      e fshehur nga dyqani
                    </span>
                  )}
                </td>
                <td className="px-4 py-2.5 text-ink-500">{p.sku || "—"}</td>
                <td className="px-4 py-2.5 tabular-nums text-ink-500">
                  {p.catalogSort}
                </td>
                {/* The catalogue's own visibility, on the page where the printed
                    order is decided — hiding a product from the shop no longer
                    takes it off the paper, so it needs its own switch here. */}
                <td className="px-4 py-2 text-center">
                  <form action={toggleProductFlagAction} className="inline">
                    <input type="hidden" name="id" value={p.id} />
                    <input type="hidden" name="flag" value="catalogHidden" />
                    <button
                      type="submit"
                      className={iconButton}
                      title={
                        p.catalogHidden
                          ? "Kthejeni në katalogun e shtypur"
                          : "Mos e shtyp këtë produkt"
                      }
                    >
                      {p.catalogHidden ? (
                        <BookX className="size-4 text-red-500" aria-hidden />
                      ) : (
                        <BookOpen className="size-4" aria-hidden />
                      )}
                      <span className="sr-only">
                        {p.catalogHidden ? "Nuk shtypet" : "Shtypet"}
                      </span>
                    </button>
                  </form>
                </td>
                <td className="px-4 py-2 text-center">
                  <div className="flex items-center justify-center gap-1">
                    {i > 0 && (
                      <form action={moveCatalogProductAction} className="inline">
                        <input type="hidden" name="sectionId" value={section.id} />
                        <input type="hidden" name="productId" value={p.id} />
                        <input type="hidden" name="dir" value="up" />
                        <button type="submit" className={iconButton} title="Lëvize lart">
                          <ArrowUp className="size-4" aria-hidden />
                          <span className="sr-only">Lëvize lart</span>
                        </button>
                      </form>
                    )}
                    {i < last && (
                      <form action={moveCatalogProductAction} className="inline">
                        <input type="hidden" name="sectionId" value={section.id} />
                        <input type="hidden" name="productId" value={p.id} />
                        <input type="hidden" name="dir" value="down" />
                        <button type="submit" className={iconButton} title="Lëvize poshtë">
                          <ArrowDown className="size-4" aria-hidden />
                          <span className="sr-only">Lëvize poshtë</span>
                        </button>
                      </form>
                    )}
                  </div>
                </td>
                <td className="px-4 py-2 text-right">
                  <form action={placeProductInCatalogAction} className="inline">
                    <input type="hidden" name="productId" value={p.id} />
                    <input type="hidden" name="sectionId" value="" />
                    <input type="hidden" name="fromSectionId" value={section.id} />
                    <button
                      type="submit"
                      title="Hiqe nga katalogu i shtypur — produkti mbetet në dyqan"
                      className="inline-flex size-8 items-center justify-center rounded-full text-ink-400 transition-colors hover:bg-red-50 hover:text-red-700"
                    >
                      <X className="size-4" aria-hidden />
                      <span className="sr-only">Hiqe nga seksioni</span>
                    </button>
                  </form>
                </td>
              </tr>
            ))}
            {section.products.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-10 text-center text-ink-400">
                  Asnjë produkt në këtë seksion.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/*
        The same bar as /admin/produktet, filtered to this section — so "all
        matching" is exactly the contents of this section, and because that
        equals what is on screen, the bar leaves the "select all N" line out.
        The section id in the filter is also what tells the action to refresh
        this page after the write.
      */}
      <ProductBulkBar
        formId={BULK_FORM}
        pageCount={section.products.length}
        total={section.products.length}
        filter={productFilterFields({ ...NO_PRODUCT_FILTER, sectionId: section.id })}
        sections={sectionOptions}
      />

      <section className="mt-8 rounded-2xl border border-ink-900/8 bg-white p-5">
        <h2 className="font-display text-lg font-bold text-ink-900">
          Shto produkte
        </h2>
        <p className="mt-0.5 text-sm text-ink-500">
          Kërkoni sipas emrit ose kodit. Produkti shtohet në fund të seksionit; i
          njëjti produkt nuk mund të jetë në dy seksione, prandaj shtimi nga një
          seksion tjetër është zhvendosje.
        </p>

        <form
          action={`/admin/katalogu/${section.id}`}
          method="get"
          role="search"
          className="mt-3 flex flex-wrap items-center gap-2"
        >
          <div className="relative min-w-56 flex-1 sm:max-w-sm">
            <Search
              aria-hidden
              className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-ink-400"
            />
            <input
              type="search"
              name="shto"
              defaultValue={query}
              placeholder="Kërko produkt për ta shtuar…"
              className="h-11 w-full rounded-xl border border-ink-900/10 bg-white pl-10 pr-3 text-sm text-ink-900 placeholder:text-ink-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/25"
            />
          </div>
          <button
            type="submit"
            className="h-11 rounded-xl border border-ink-900/10 bg-white px-4 text-sm font-semibold text-ink-700 transition-colors hover:border-brand-300 hover:text-ink-900"
          >
            Kërko
          </button>
        </form>

        {query && (
          <ul className="mt-4 divide-y divide-ink-900/6">
            {candidates.map((c) => (
              <li key={c.id} className="flex items-center gap-3 py-2.5">
                <div className="min-w-0 flex-1">
                  <Link
                    href={`/admin/produktet/${c.id}`}
                    className="block truncate text-sm font-medium text-ink-900 hover:text-brand-700"
                    title={c.name}
                  >
                    {c.name}
                  </Link>
                  <span className="text-xs text-ink-400">
                    {c.sku ? `Kodi ${c.sku}` : "pa kod"}
                    {c.currentSection
                      ? ` · tani te ${c.currentSection}`
                      : " · jashtë katalogut"}
                  </span>
                </div>
                <form action={placeProductInCatalogAction}>
                  <input type="hidden" name="productId" value={c.id} />
                  <input type="hidden" name="sectionId" value={section.id} />
                  {c.currentSectionId !== null && (
                    <input
                      type="hidden"
                      name="fromSectionId"
                      value={c.currentSectionId}
                    />
                  )}
                  <button
                    type="submit"
                    className="inline-flex items-center gap-1.5 rounded-full bg-brand-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand-700"
                  >
                    <Plus className="size-4" aria-hidden />
                    {c.currentSectionId === null ? "Shto" : "Zhvendos"}
                  </button>
                </form>
              </li>
            ))}
            {candidates.length === 0 && (
              <li className="py-6 text-center text-sm text-ink-400">
                Asnjë produkt nuk përputhet me «{query}».
              </li>
            )}
          </ul>
        )}
      </section>
    </div>
  );
}
