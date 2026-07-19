"use client";

import { useActionState } from "react";
import { CircleAlert, CircleCheck, Loader2, Save } from "lucide-react";
import {
  createProductAction,
  updateProductAction,
  type AdminFormState,
} from "@/lib/admin-actions";

export interface ProductFormValues {
  id?: number;
  name: string;
  sku: string;
  price: string; // decimal euros, e.g. "5.50"
  regularPrice: string;
  inStock: boolean;
  featured: boolean;
  hidden: boolean;
  displayName: string;
  imageOverride: string;
  images: string; // one URL per line
  shortDescription: string;
  description: string;
  categoryIds: number[];
}

export interface CategoryOption {
  id: number;
  label: string;
  depth: number;
}

const initialState: AdminFormState = {};

function Field({
  label,
  error,
  children,
  hint,
}: {
  label: string;
  error?: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-semibold text-ink-900">
        {label}
      </label>
      {children}
      {hint && !error && <p className="mt-1 text-xs text-ink-400">{hint}</p>}
      {error && <p className="mt-1 text-xs font-medium text-red-700">{error}</p>}
    </div>
  );
}

const inputCls =
  "h-11 w-full rounded-xl border border-ink-900/10 bg-white px-3.5 text-sm text-ink-900 placeholder:text-ink-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/25";
const areaCls =
  "w-full rounded-xl border border-ink-900/10 bg-white px-3.5 py-2.5 text-sm text-ink-900 placeholder:text-ink-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/25";

export function ProductForm({
  values,
  categories,
}: {
  values: ProductFormValues;
  categories: CategoryOption[];
}) {
  const isNew = values.id === undefined;
  const [state, formAction, pending] = useActionState(
    isNew ? createProductAction : updateProductAction,
    initialState
  );
  const err = state.fieldErrors ?? {};

  return (
    <form action={formAction} noValidate className="space-y-5">
      {!isNew && <input type="hidden" name="id" value={values.id} />}

      {state.error && (
        <p role="alert" className="flex items-start gap-2 rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-800">
          <CircleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
          {state.error}
        </p>
      )}
      {state.success && (
        <p role="status" className="flex items-start gap-2 rounded-xl bg-brand-50 px-4 py-3 text-sm font-medium text-brand-800">
          <CircleCheck className="mt-0.5 size-4 shrink-0" aria-hidden />
          {state.success}
        </p>
      )}

      <div className="grid gap-5 lg:grid-cols-[2fr_1fr]">
        {/* Left column: content */}
        <div className="space-y-5">
          <Field label="Emri i produktit *" error={err.name}>
            <input name="name" defaultValue={values.name} required className={inputCls} />
          </Field>

          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Kodi (SKU)" error={err.sku}>
              <input name="sku" defaultValue={values.sku} className={inputCls} />
            </Field>
            <Field
              label="Emri i shfaqur (opsional)"
              error={err.displayName}
              hint="Mbishkruan emrin në kartela — p.sh. formati «Lloji – marka & modeli»."
            >
              <input name="displayName" defaultValue={values.displayName} className={inputCls} />
            </Field>
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Çmimi me shumicë (€) *" error={err.price}>
              <input
                name="price"
                type="number"
                step="0.01"
                min="0"
                inputMode="decimal"
                defaultValue={values.price}
                required
                className={inputCls}
              />
            </Field>
            <Field
              label="Çmimi i rregullt (€)"
              error={err.regularPrice}
              hint="Nëse është më i lartë se çmimi, produkti shfaqet si ofertë."
            >
              <input
                name="regularPrice"
                type="number"
                step="0.01"
                min="0"
                inputMode="decimal"
                defaultValue={values.regularPrice}
                className={inputCls}
              />
            </Field>
          </div>

          <Field label="Përshkrimi i shkurtër" error={err.shortDescription}>
            <textarea
              name="shortDescription"
              rows={2}
              defaultValue={values.shortDescription}
              className={areaCls}
            />
          </Field>

          <Field label="Përshkrimi" error={err.description}>
            <textarea
              name="description"
              rows={5}
              defaultValue={values.description}
              className={areaCls}
            />
          </Field>

          <Field
            label="Fotot (një URL për rresht)"
            error={err.images}
            hint="URL të plota (https://…) ose shtigje lokale (/products/…)."
          >
            <textarea
              name="images"
              rows={3}
              defaultValue={values.images}
              placeholder={"https://…/foto1.png\n/products/foto2.png"}
              className={`${areaCls} font-mono text-xs`}
            />
          </Field>

          <Field
            label="Foto kryesore alternative (opsional)"
            error={err.imageOverride}
            hint="Mbishkruan foton e parë në kartela — p.sh. /products/0018-tensiometer.png"
          >
            <input name="imageOverride" defaultValue={values.imageOverride} className={`${inputCls} font-mono text-xs`} />
          </Field>
        </div>

        {/* Right column: flags + categories */}
        <div className="space-y-5">
          <div className="rounded-2xl border border-ink-900/8 bg-white p-4">
            <h3 className="text-xs font-bold uppercase tracking-wide text-ink-500">
              Statusi
            </h3>
            <label className="mt-3 flex items-center gap-2.5 text-sm font-medium text-ink-900">
              <input
                type="checkbox"
                name="inStock"
                defaultChecked={values.inStock}
                className="size-4.5 rounded accent-brand-600"
              />
              Në stok
            </label>
            <label className="mt-2.5 flex items-center gap-2.5 text-sm font-medium text-ink-900">
              <input
                type="checkbox"
                name="featured"
                defaultChecked={values.featured}
                className="size-4.5 rounded accent-brand-600"
              />
              Produkt kryesor (ballina)
            </label>
            <label className="mt-2.5 flex items-center gap-2.5 text-sm font-medium text-ink-900">
              <input
                type="checkbox"
                name="hidden"
                defaultChecked={values.hidden}
                className="size-4.5 rounded accent-brand-600"
              />
              Fshihe nga faqja publike
            </label>
          </div>

          <div className="rounded-2xl border border-ink-900/8 bg-white p-4">
            <h3 className="text-xs font-bold uppercase tracking-wide text-ink-500">
              Kategoritë
            </h3>
            <div className="mt-3 max-h-80 space-y-1 overflow-y-auto pr-1">
              {categories.map((c) => (
                <label
                  key={c.id}
                  className="flex items-center gap-2.5 rounded-lg px-2 py-1.5 text-sm text-ink-700 hover:bg-tint"
                  style={{ marginLeft: c.depth * 14 }}
                >
                  <input
                    type="checkbox"
                    name="categoryIds"
                    value={c.id}
                    defaultChecked={values.categoryIds.includes(c.id)}
                    className="size-4 rounded accent-brand-600"
                  />
                  {c.label}
                </label>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3 border-t border-ink-900/8 pt-5">
        <button
          type="submit"
          disabled={pending}
          className="inline-flex min-h-11 items-center gap-2 rounded-full bg-brand-600 px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-700 disabled:opacity-60"
        >
          {pending ? (
            <Loader2 className="size-4.5 animate-spin" aria-hidden />
          ) : (
            <Save className="size-4.5" aria-hidden />
          )}
          {isNew ? "Krijo produktin" : "Ruaj ndryshimet"}
        </button>
      </div>
    </form>
  );
}
