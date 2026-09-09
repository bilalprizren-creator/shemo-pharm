import { BookOpen, BookX, Eye, EyeOff, Star } from "lucide-react";
import { toggleProductFlagAction } from "@/lib/admin-actions";
import { AdminAction } from "@/components/admin/AdminAction";

/**
 * The four switches that make up a product's state, each on its own.
 *
 * They were written inline in the product table's cells, which was fine while
 * the table was the only place they appeared. The phone gets a card list
 * instead of an 980px table, and the same four switches have to be on the card
 * — so they live here, and the two presentations share the wiring rather than
 * each carrying a copy of which action, which flag and which pair of labels.
 *
 * Each takes only the fields it reads, so /admin/katalogu/[id] can use the
 * catalogue one without holding a whole product row.
 */

const ICON_BUTTON = "inline-flex rounded-full p-1.5 hover:bg-tint";

export function StockToggle({ id, inStock }: { id: number; inStock: boolean }) {
  return (
    <AdminAction
      action={toggleProductFlagAction}
      fields={{ id, flag: "inStock" }}
      label={inStock ? "Në stok" : "Pa stok"}
      title="Ndrysho stokun"
      className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
        inStock
          ? "bg-brand-50 text-brand-800 hover:bg-brand-100"
          : "bg-red-50 text-red-700 hover:bg-red-100"
      }`}
    />
  );
}

export function FeaturedToggle({ id, featured }: { id: number; featured: boolean }) {
  return (
    <AdminAction
      action={toggleProductFlagAction}
      fields={{ id, flag: "featured" }}
      title={featured ? "Hiqe nga kryesorët" : "Shto te kryesorët"}
      icon={
        <Star
          className={`size-4 ${featured ? "fill-amber-400 text-amber-400" : "text-ink-300"}`}
          aria-hidden
        />
      }
      label={<span className="sr-only">{featured ? "I zgjedhur" : "Jo i zgjedhur"}</span>}
      className={ICON_BUTTON}
    />
  );
}

export function ShopToggle({ id, hidden }: { id: number; hidden: boolean }) {
  return (
    <AdminAction
      action={toggleProductFlagAction}
      fields={{ id, flag: "hidden" }}
      title={hidden ? "Shfaqe në dyqan" : "Fshihe nga dyqani"}
      icon={
        hidden ? (
          <EyeOff className="size-4 text-red-500" aria-hidden />
        ) : (
          <Eye className="size-4 text-ink-400" aria-hidden />
        )
      }
      label={
        <span className="sr-only">
          {hidden ? "E fshehur në dyqan" : "E dukshme në dyqan"}
        </span>
      }
      className={ICON_BUTTON}
    />
  );
}

export function CatalogToggle({
  id,
  catalogHidden,
  sectionId,
  className = ICON_BUTTON,
}: {
  id: number;
  catalogHidden: boolean;
  /** Passed on /admin/katalogu/[id] so the action revalidates that page too. */
  sectionId?: number;
  className?: string;
}) {
  return (
    <AdminAction
      action={toggleProductFlagAction}
      fields={
        sectionId === undefined
          ? { id, flag: "catalogHidden" }
          : { id, flag: "catalogHidden", sectionId }
      }
      title={
        catalogHidden ? "Shfaqe në katalogun e shtypur" : "Fshihe nga katalogu i shtypur"
      }
      icon={
        catalogHidden ? (
          <BookX className="size-4 text-red-500" aria-hidden />
        ) : (
          <BookOpen className="size-4 text-ink-400" aria-hidden />
        )
      }
      label={
        <span className="sr-only">{catalogHidden ? "Jashtë katalogut" : "Në katalog"}</span>
      }
      className={className}
    />
  );
}

/**
 * All four in a row, for the phone card where there are no columns to put them
 * in. Labelled, because a bare icon in a card has no column heading above it to
 * say what it means.
 */
export function ProductToggleRow({
  product,
}: {
  product: {
    id: number;
    inStock: boolean;
    featured: boolean;
    hidden: boolean;
    catalogHidden: boolean;
  };
}) {
  return (
    <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1.5">
      <StockToggle id={product.id} inStock={product.inStock} />
      <LabelledToggle label="Kryesor">
        <FeaturedToggle id={product.id} featured={product.featured} />
      </LabelledToggle>
      <LabelledToggle label="Dyqani">
        <ShopToggle id={product.id} hidden={product.hidden} />
      </LabelledToggle>
      <LabelledToggle label="Katalogu">
        <CatalogToggle id={product.id} catalogHidden={product.catalogHidden} />
      </LabelledToggle>
    </div>
  );
}

function LabelledToggle({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <span className="inline-flex items-center gap-0.5 text-[11px] font-medium text-ink-400">
      {children}
      <span aria-hidden>{label}</span>
    </span>
  );
}
