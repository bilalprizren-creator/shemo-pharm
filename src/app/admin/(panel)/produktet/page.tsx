import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Plus, Search } from "lucide-react";
import { requireAdmin } from "@/lib/auth";
import {
  getAdminCatalogSectionOptions,
  getAdminCategoryOptions,
  getSiteVisibilityCounts,
  listAdminProducts,
} from "@/lib/admin-data";
import {
  isFiltering,
  parseProductFilter,
  productFilterFields,
  productFilterParams,
  SECTION_OPTIONS,
  STOCK_OPTIONS,
  VISIBILITY_OPTIONS,
} from "@/lib/product-filter";
import { AdminFilterDisclosure } from "@/components/admin/AdminFilterDisclosure";
import { ProductFilterSelects } from "@/components/admin/ProductFilterSelects";
import { ProductPriceCell } from "@/components/admin/ProductPriceCell";
import {
  ProductBulkBar,
  ProductRowCheckbox,
  ProductSelectAll,
} from "@/components/admin/ProductBulkBar";
import { AdminPager } from "@/components/admin/AdminPager";
import {
  CatalogToggle,
  FeaturedToggle,
  ProductToggleRow,
  ShopToggle,
  StockToggle,
} from "@/components/admin/ProductToggles";
import { SiteVisibilitySummary } from "@/components/admin/SiteVisibilitySummary";

export const metadata: Metadata = { title: "Produktet" };

const PER_PAGE = 50;

/** Ties the row checkboxes to the bulk form they are not nested inside. */
const BULK_FORM = "bulk-products";

export default async function AdminProductsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireAdmin();
  const sp = await searchParams;
  // Both lists are needed twice over — to validate the URL, and to fill the
  // dropdowns in the filter row and in the bulk bar.
  const [sectionOptions, categoryOptions, siteCounts] = await Promise.all([
    getAdminCatalogSectionOptions(),
    getAdminCategoryOptions(),
    getSiteVisibilityCounts(),
  ]);

  // The same parser the bulk actions use on the fields the bar posts back, so
  // "all matching" cannot mean a set other than the one counted here.
  const filter = parseProductFilter(sp, {
    sectionIds: new Set(sectionOptions.map((s) => s.id)),
    categoryIds: new Set(categoryOptions.map((c) => c.id)),
  });
  const { query, stock, visibility, catalogVisibility, section } = filter;
  const { sectionId, categoryId } = filter;
  // Math.floor as well as the clamp: "faqja=2.5" would otherwise offset by a
  // page and a half and label the result "Faqja 2.5".
  const page = Math.max(1, Math.floor(Number(sp.faqja)) || 1);
  const filtering = isFiltering(filter);

  const pageHref = (p: number) => {
    const params = productFilterParams(filter);
    if (p > 1) params.set("faqja", String(p));
    const qs = params.toString();
    return `/admin/produktet${qs ? `?${qs}` : ""}`;
  };

  const { rows, total } = await listAdminProducts({
    ...filter,
    page,
    perPage: PER_PAGE,
  });
  const totalPages = Math.max(1, Math.ceil(total / PER_PAGE));

  // Past the last page there is nothing to show and — since "Mbrapa" only steps
  // back one — no comfortable way back either. Land on the last real page
  // instead of an empty table.
  if (page > totalPages) redirect(pageHref(totalPages));

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-extrabold tracking-tight text-ink-900">
            Produktet
          </h1>
          <p className="mt-1 text-sm text-ink-500">
            {filtering ? `${total} produkte përputhen` : `${total} produkte në katalog`}
            {filtering && (
              <>
                {" · "}
                <Link
                  href="/admin/produktet"
                  className="font-semibold text-brand-700 hover:underline"
                >
                  Pastro filtrat
                </Link>
              </>
            )}
          </p>
        </div>
        <Link
          href="/admin/produktet/new"
          className="inline-flex items-center gap-1.5 rounded-full bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-700"
        >
          <Plus className="size-4" aria-hidden />
          Produkt i ri
        </Link>
      </div>

      {/* The two ranges, before the table that mixes them. This is also the
          page where "all products" actually means all of them: the table is
          unfiltered by default, hidden ones included, which no public page is. */}
      <SiteVisibilitySummary counts={siteCounts} className="mt-5" />

      {/*
        Keyed on the active filters so "Pastro filtrat" — a client-side Link, which
        would otherwise keep this subtree mounted — actually empties the search box
        and puts both selects back to "Të gjitha".
      */}
      <form
        key={`${query}|${stock}|${visibility}|${catalogVisibility}|${section}|${sectionId}|${categoryId}`}
        action="/admin/produktet"
        method="get"
        role="search"
        className="mt-5 flex flex-wrap items-center gap-2"
      >
        <div className="relative min-w-56 flex-1 sm:max-w-sm">
          <Search
            aria-hidden
            className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-ink-400"
          />
          <input
            type="search"
            name="kerko"
            defaultValue={query}
            placeholder="Kërko sipas emrit ose kodit…"
            className="h-11 w-full rounded-xl border border-ink-900/10 bg-white pl-10 pr-3 text-sm text-ink-900 placeholder:text-ink-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/25"
          />
        </div>
        <AdminFilterDisclosure
          activeCount={
            [stock, visibility, catalogVisibility, section].filter(Boolean).length +
            (categoryId === null ? 0 : 1) +
            (sectionId === null ? 0 : 1)
          }
        >
        <ProductFilterSelects
          filters={[
            { name: "stoku", label: "Stoku", value: stock, options: STOCK_OPTIONS },
            {
              name: "dukshmeria",
              label: "Dyqani",
              value: visibility,
              options: VISIBILITY_OPTIONS,
            },
            {
              name: "katalogu",
              label: "Katalogu",
              value: catalogVisibility,
              options: VISIBILITY_OPTIONS,
            },
            {
              name: "seksioni",
              label: "Seksioni",
              value: section,
              options: SECTION_OPTIONS,
            },
            // The two filters that name a group rather than a state. They are
            // what makes "the shop sells this, the catalogue prints that" a
            // decision somebody can act on: pick the brand or the section, then
            // set its visibility for one site in a single press.
            {
              name: "kategoria",
              label: "Kategoria",
              value: categoryId === null ? "" : String(categoryId),
              options: [
                { value: "", label: "Të gjitha kategoritë" },
                ...categoryOptions.map((c) => ({
                  value: String(c.id),
                  // Non-breaking spaces: a <option> collapses ordinary ones, and
                  // the tree is unreadable flattened — 200-odd entries of which
                  // most are children of something.
                  label: `${"  ".repeat(c.depth)}${c.label}`,
                })),
              ],
            },
            {
              name: "seksioniId",
              label: "Seksioni i shtypur",
              value: sectionId === null ? "" : String(sectionId),
              options: [
                { value: "", label: "Të gjithë seksionet" },
                ...sectionOptions.map((s) => ({
                  value: String(s.id),
                  label: s.label,
                })),
              ],
            },
          ]}
        />
        </AdminFilterDisclosure>
        <button
          type="submit"
          className="h-11 rounded-xl border border-ink-900/10 bg-white px-4 text-sm font-semibold text-ink-700 transition-colors hover:border-brand-300 hover:text-ink-900"
        >
          Filtro
        </button>
      </form>

      {/* Cards on a phone, the table from `sm` up.

          The table is eight columns and 980px wide, which on a 400px screen
          showed the checkbox and the first two thirds of the product name —
          the price and all four switches were off to the right inside the
          scroll container, so the page could only be used by zooming out until
          the text was unreadable. Both presentations render the same switch
          components, so they cannot drift apart. */}
      <ul className="mt-4 divide-y divide-ink-900/6 overflow-hidden rounded-2xl border border-ink-900/8 bg-white sm:hidden">
        {rows.map((p) => (
          <li
            key={p.id}
            className={`p-3 ${p.hidden && p.catalogHidden ? "opacity-55" : ""}`}
          >
            <div className="flex items-start gap-2.5">
              <span className="pt-0.5">
                <ProductRowCheckbox
                  id={p.id}
                  formId={BULK_FORM}
                  label={`Zgjidh ${p.name}`}
                />
              </span>
              <div className="min-w-0 flex-1">
                <Link
                  href={`/admin/produktet/${p.id}`}
                  className="block font-medium leading-snug text-ink-900 hover:text-brand-700"
                >
                  {p.name}
                </Link>
                <p className="mt-0.5 text-xs text-ink-400">
                  {p.sku ? `Kodi: ${p.sku}` : "Pa kod"}
                </p>
                <div className="mt-2">
                  <ProductPriceCell id={p.id} name={p.name} priceCents={p.priceCents} />
                </div>
                <ProductToggleRow product={p} />
              </div>
            </div>
          </li>
        ))}
        {rows.length === 0 && (
          <li className="px-4 py-10 text-center text-sm text-ink-400">
            Asnjë produkt nuk përputhet me kërkimin dhe filtrat.
          </li>
        )}
      </ul>

      <div className="mt-4 hidden overflow-x-auto rounded-2xl border border-ink-900/8 bg-white sm:block">
        <table className="w-full min-w-[980px] text-left text-sm">
          <thead>
            <tr className="border-b border-ink-900/8 text-xs uppercase tracking-wide text-ink-400">
              <th className="w-10 pl-4 pr-1 py-3">
                <ProductSelectAll pageIds={rows.map((p) => p.id)} />
              </th>
              <th className="px-4 py-3 font-semibold">Produkti</th>
              <th className="px-4 py-3 font-semibold">Kodi</th>
              <th className="px-4 py-3 font-semibold">Çmimi</th>
              <th className="px-4 py-3 font-semibold">Stoku</th>
              <th className="px-4 py-3 font-semibold text-center">Kryesor</th>
              <th className="px-4 py-3 font-semibold text-center">Dyqani</th>
              <th className="px-4 py-3 font-semibold text-center">Katalogu</th>
            </tr>
          </thead>
          <tbody>
            {/* Dimmed only when the product is nowhere to be seen. Hidden in one
                site and shown in the other is a normal state now, and the two
                buttons on the right say which is which. */}
            {rows.map((p) => (
              <tr
                key={p.id}
                className={`border-b border-ink-900/4 last:border-0 ${
                  p.hidden && p.catalogHidden ? "opacity-55" : ""
                }`}
              >
                {/* Associated with the bulk form by id rather than nested in
                    it: this cell's siblings are forms of their own, and a form
                    inside a form is not something HTML has. */}
                <td className="w-10 py-2.5 pl-4 pr-1">
                  <ProductRowCheckbox
                    id={p.id}
                    formId={BULK_FORM}
                    label={`Zgjidh ${p.name}`}
                  />
                </td>
                <td className="max-w-[320px] px-4 py-2.5">
                  <Link
                    href={`/admin/produktet/${p.id}`}
                    className="block truncate font-medium text-ink-900 hover:text-brand-700"
                    title={p.name}
                  >
                    {p.name}
                  </Link>
                </td>
                <td className="px-4 py-2.5 text-ink-500">{p.sku || "—"}</td>
                <td className="px-4 py-2">
                  <ProductPriceCell id={p.id} name={p.name} priceCents={p.priceCents} />
                </td>
                <td className="px-4 py-2.5">
                  <StockToggle id={p.id} inStock={p.inStock} />
                </td>
                <td className="px-4 py-2.5 text-center">
                  <FeaturedToggle id={p.id} featured={p.featured} />
                </td>
                <td className="px-4 py-2.5 text-center">
                  <ShopToggle id={p.id} hidden={p.hidden} />
                </td>
                <td className="px-4 py-2.5 text-center">
                  <CatalogToggle id={p.id} catalogHidden={p.catalogHidden} />
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-10 text-center text-ink-400">
                  Asnjë produkt nuk përputhet me kërkimin dhe filtrat.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <ProductBulkBar
        formId={BULK_FORM}
        pageIds={rows.map((p) => p.id)}
        total={total}
        filter={productFilterFields(filter)}
        sections={sectionOptions}
      />

      <AdminPager page={page} totalPages={totalPages} hrefFor={pageHref} />
    </div>
  );
}
