import type { Metadata } from "next";
import Link from "next/link";
import { Eye, EyeOff, Plus, Search, Star } from "lucide-react";
import { requireAdmin } from "@/lib/auth";
import { listAdminProducts } from "@/lib/admin-data";
import { toggleProductFlagAction } from "@/lib/admin-actions";
import { ProductFilterSelects } from "@/components/admin/ProductFilterSelects";
import { ProductPriceCell } from "@/components/admin/ProductPriceCell";

export const metadata: Metadata = { title: "Produktet" };

const PER_PAGE = 50;

/**
 * The filter vocabulary lives here, not in the select component, so the page can
 * validate a URL against exactly the options it offers. First entry is the
 * absent filter and doubles as the fallback for anything else the URL carries.
 */
const STOCK_OPTIONS = [
  { value: "", label: "Të gjitha" },
  { value: "ne-stok", label: "Në stok" },
  { value: "pa-stok", label: "Pa stok" },
] as const;

const VISIBILITY_OPTIONS = [
  { value: "", label: "Të gjitha" },
  { value: "e-dukshme", label: "E dukshme" },
  { value: "e-fshehur", label: "E fshehur" },
] as const;

function pick<T extends string>(
  raw: string | undefined,
  options: readonly { readonly value: T }[]
): T {
  return options.find((o) => o.value === raw)?.value ?? options[0].value;
}

export default async function AdminProductsPage({
  searchParams,
}: {
  searchParams: Promise<{
    kerko?: string;
    faqja?: string;
    stoku?: string;
    dukshmeria?: string;
  }>;
}) {
  await requireAdmin();
  const sp = await searchParams;
  const query = sp.kerko?.trim() ?? "";
  const stock = pick(sp.stoku, STOCK_OPTIONS);
  const visibility = pick(sp.dukshmeria, VISIBILITY_OPTIONS);
  const page = Math.max(1, Number(sp.faqja) || 1);
  const filtering = query !== "" || stock !== "" || visibility !== "";

  const { rows, total } = await listAdminProducts({
    query,
    stock,
    visibility,
    page,
    perPage: PER_PAGE,
  });
  const totalPages = Math.max(1, Math.ceil(total / PER_PAGE));

  const pageHref = (p: number) => {
    const params = new URLSearchParams();
    if (query) params.set("kerko", query);
    if (stock) params.set("stoku", stock);
    if (visibility) params.set("dukshmeria", visibility);
    if (p > 1) params.set("faqja", String(p));
    const qs = params.toString();
    return `/admin/produktet${qs ? `?${qs}` : ""}`;
  };

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

      {/*
        Keyed on the active filters so "Pastro filtrat" — a client-side Link, which
        would otherwise keep this subtree mounted — actually empties the search box
        and puts both selects back to "Të gjitha".
      */}
      <form
        key={`${query}|${stock}|${visibility}`}
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
        <ProductFilterSelects
          filters={[
            { name: "stoku", label: "Stoku", value: stock, options: STOCK_OPTIONS },
            {
              name: "dukshmeria",
              label: "Dukshmëria",
              value: visibility,
              options: VISIBILITY_OPTIONS,
            },
          ]}
        />
        <button
          type="submit"
          className="h-11 rounded-xl border border-ink-900/10 bg-white px-4 text-sm font-semibold text-ink-700 transition-colors hover:border-brand-300 hover:text-ink-900"
        >
          Filtro
        </button>
      </form>

      <div className="mt-4 overflow-x-auto rounded-2xl border border-ink-900/8 bg-white">
        <table className="w-full min-w-[860px] text-left text-sm">
          <thead>
            <tr className="border-b border-ink-900/8 text-xs uppercase tracking-wide text-ink-400">
              <th className="px-4 py-3 font-semibold">Produkti</th>
              <th className="px-4 py-3 font-semibold">Kodi</th>
              <th className="px-4 py-3 font-semibold">Çmimi</th>
              <th className="px-4 py-3 font-semibold">Stoku</th>
              <th className="px-4 py-3 font-semibold text-center">Kryesor</th>
              <th className="px-4 py-3 font-semibold text-center">Dukshmëria</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((p) => (
              <tr
                key={p.id}
                className={`border-b border-ink-900/4 last:border-0 ${
                  p.hidden ? "opacity-55" : ""
                }`}
              >
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
                  <form action={toggleProductFlagAction}>
                    <input type="hidden" name="id" value={p.id} />
                    <input type="hidden" name="flag" value="inStock" />
                    <button
                      type="submit"
                      className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                        p.inStock
                          ? "bg-brand-50 text-brand-800 hover:bg-brand-100"
                          : "bg-red-50 text-red-700 hover:bg-red-100"
                      }`}
                      title="Ndrysho stokun"
                    >
                      {p.inStock ? "Në stok" : "Pa stok"}
                    </button>
                  </form>
                </td>
                <td className="px-4 py-2.5 text-center">
                  <form action={toggleProductFlagAction} className="inline">
                    <input type="hidden" name="id" value={p.id} />
                    <input type="hidden" name="flag" value="featured" />
                    <button
                      type="submit"
                      className="rounded-full p-1.5 hover:bg-tint"
                      title={p.featured ? "Hiqe nga kryesorët" : "Shto te kryesorët"}
                    >
                      <Star
                        className={`size-4 ${
                          p.featured
                            ? "fill-amber-400 text-amber-400"
                            : "text-ink-300"
                        }`}
                        aria-hidden
                      />
                      <span className="sr-only">
                        {p.featured ? "I zgjedhur" : "Jo i zgjedhur"}
                      </span>
                    </button>
                  </form>
                </td>
                <td className="px-4 py-2.5 text-center">
                  <form action={toggleProductFlagAction} className="inline">
                    <input type="hidden" name="id" value={p.id} />
                    <input type="hidden" name="flag" value="hidden" />
                    <button
                      type="submit"
                      className="rounded-full p-1.5 hover:bg-tint"
                      title={p.hidden ? "Shfaqe në faqe" : "Fshihe nga faqja"}
                    >
                      {p.hidden ? (
                        <EyeOff className="size-4 text-red-500" aria-hidden />
                      ) : (
                        <Eye className="size-4 text-ink-400" aria-hidden />
                      )}
                      <span className="sr-only">{p.hidden ? "E fshehur" : "E dukshme"}</span>
                    </button>
                  </form>
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-ink-400">
                  Asnjë produkt nuk përputhet me kërkimin dhe filtrat.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <nav className="mt-5 flex items-center justify-center gap-2" aria-label="Faqet">
          {page > 1 && (
            <Link
              href={pageHref(page - 1)}
              className="rounded-full border border-ink-900/10 bg-white px-4 py-2 text-sm font-semibold text-ink-700 hover:border-brand-300"
            >
              ← Mbrapa
            </Link>
          )}
          <span className="px-2 text-sm text-ink-500">
            Faqja {page} / {totalPages}
          </span>
          {page < totalPages && (
            <Link
              href={pageHref(page + 1)}
              className="rounded-full border border-ink-900/10 bg-white px-4 py-2 text-sm font-semibold text-ink-700 hover:border-brand-300"
            >
              Para →
            </Link>
          )}
        </nav>
      )}
    </div>
  );
}
