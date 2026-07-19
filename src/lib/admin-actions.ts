"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import {
  createSessionCookie,
  clearSessionCookie,
  findUser,
  getSession,
  isAdmin,
  requireAdmin,
  verifyPassword,
} from "@/lib/auth";
import { sql } from "@/lib/db";

/**
 * All admin mutations live here. Every action re-checks authorization with
 * requireAdmin() — server actions are directly reachable via POST, so the
 * layout guard alone is never enough.
 */

export interface AdminFormState {
  error?: string;
  success?: string;
  fieldErrors?: Record<string, string>;
}

/* ------------------------------- Auth ---------------------------------- */

export async function adminLoginAction(
  _prev: AdminFormState,
  formData: FormData
): Promise<AdminFormState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  if (!email || !password) {
    return { error: "Plotësoni email-in dhe fjalëkalimin." };
  }

  const user = await findUser(email);
  if (!user || !verifyPassword(password, user.passwordHash)) {
    return { error: "Të dhëna të pasakta." };
  }
  if (user.role !== "admin") {
    return { error: "Kjo llogari nuk ka qasje administratori." };
  }

  await createSessionCookie(user);
  redirect("/admin");
}

export async function adminLogoutAction(): Promise<void> {
  await clearSessionCookie();
  redirect("/admin/login");
}

/* --------------------------- User approvals ----------------------------- */

export async function approveUserAction(formData: FormData): Promise<void> {
  await requireAdmin();
  const id = Number(formData.get("id"));
  if (!Number.isInteger(id)) return;
  await sql`
    UPDATE users SET status = 'approved' WHERE id = ${id} AND role = 'customer'
  `;
  revalidatePath("/admin/kerkesat");
  revalidatePath("/admin");
}

export async function revokeUserAction(formData: FormData): Promise<void> {
  await requireAdmin();
  const id = Number(formData.get("id"));
  if (!Number.isInteger(id)) return;
  await sql`
    UPDATE users SET status = 'pending' WHERE id = ${id} AND role = 'customer'
  `;
  revalidatePath("/admin/kerkesat");
  revalidatePath("/admin");
}

/** Rejecting a request deletes the account — customers only, never admins. */
export async function rejectUserAction(formData: FormData): Promise<void> {
  await requireAdmin();
  const id = Number(formData.get("id"));
  if (!Number.isInteger(id)) return;
  await sql`DELETE FROM users WHERE id = ${id} AND role = 'customer'`;
  revalidatePath("/admin/kerkesat");
  revalidatePath("/admin");
}

/* ------------------------------ Products -------------------------------- */

const productSchema = z.object({
  name: z.string().trim().min(2, "Emri duhet të ketë të paktën 2 shkronja."),
  sku: z.string().trim().max(40).optional().or(z.literal("")),
  price: z.coerce.number().min(0, "Çmimi nuk mund të jetë negativ."),
  regularPrice: z.coerce.number().min(0).optional(),
  inStock: z.coerce.boolean(),
  featured: z.coerce.boolean(),
  hidden: z.coerce.boolean(),
  displayName: z.string().trim().max(200).optional().or(z.literal("")),
  imageOverride: z.string().trim().max(500).optional().or(z.literal("")),
  images: z.string().max(5000).optional().or(z.literal("")),
  shortDescription: z.string().trim().max(2000).optional().or(z.literal("")),
  description: z.string().trim().max(8000).optional().or(z.literal("")),
});

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/ç/g, "c")
    .replace(/ë/g, "e")
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120);
}

function parseImages(raw: string | undefined): string[] {
  if (!raw) return [];
  return raw
    .split(/\r?\n/)
    .map((s) => s.trim())
    .filter((s) => /^(https?:\/\/|\/)/.test(s))
    .slice(0, 10);
}

function parseCategoryIds(formData: FormData): number[] {
  return formData
    .getAll("categoryIds")
    .map((v) => Number(v))
    .filter((n) => Number.isInteger(n) && n > 0);
}

async function syncProductCategories(
  productId: number,
  categoryIds: number[]
): Promise<void> {
  await sql`DELETE FROM product_categories WHERE product_id = ${productId}`;
  if (categoryIds.length) {
    await sql`
      INSERT INTO product_categories (product_id, category_id)
      SELECT ${productId}, id FROM categories WHERE id = ANY(${categoryIds})
      ON CONFLICT DO NOTHING
    `;
  }
  // Keep the per-category product counts the sidebar shows in sync.
  await sql`
    UPDATE categories c SET count = sub.n
    FROM (
      SELECT c2.id, count(pc.product_id)::int AS n
      FROM categories c2
      LEFT JOIN product_categories pc ON pc.category_id = c2.id
      LEFT JOIN products p ON p.id = pc.product_id AND p.hidden = false
      GROUP BY c2.id
    ) sub
    WHERE c.id = sub.id AND c.count IS DISTINCT FROM sub.n
  `;
}

function productFromForm(formData: FormData) {
  const parsed = productSchema.safeParse({
    name: formData.get("name"),
    sku: formData.get("sku"),
    price: formData.get("price"),
    regularPrice: formData.get("regularPrice") || undefined,
    inStock: formData.get("inStock") === "on",
    featured: formData.get("featured") === "on",
    hidden: formData.get("hidden") === "on",
    displayName: formData.get("displayName"),
    imageOverride: formData.get("imageOverride"),
    images: formData.get("images"),
    shortDescription: formData.get("shortDescription"),
    description: formData.get("description"),
  });
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = String(issue.path[0] ?? "form");
      if (!fieldErrors[key]) fieldErrors[key] = issue.message;
    }
    return { fieldErrors } as const;
  }
  const d = parsed.data;
  const priceCents = Math.round(d.price * 100);
  const regularCents = Math.round((d.regularPrice ?? d.price) * 100);
  return {
    data: {
      name: d.name,
      sku: d.sku ?? "",
      priceCents,
      regularCents: Math.max(regularCents, priceCents),
      inStock: d.inStock,
      featured: d.featured,
      hidden: d.hidden,
      displayName: d.displayName || null,
      imageOverride: d.imageOverride || null,
      images: parseImages(d.images),
      shortDescription: d.shortDescription ?? "",
      description: d.description ?? "",
    },
  } as const;
}

function revalidateCatalog(): void {
  // Public catalog pages are dynamic (they read the session cookie), so they
  // already re-query on every request. Just refresh the admin views' router
  // cache so the list/dashboard reflect the change on navigation.
  revalidatePath("/admin/produktet");
  revalidatePath("/admin");
}

export async function createProductAction(
  _prev: AdminFormState,
  formData: FormData
): Promise<AdminFormState> {
  await requireAdmin();
  const result = productFromForm(formData);
  if ("fieldErrors" in result) return { fieldErrors: result.fieldErrors };
  const p = result.data;

  const slugBase = slugify(p.name) || "produkt";
  const rows = (await sql`
    INSERT INTO products (
      id, name, slug, sku, price_cents, regular_cents, on_sale, currency,
      images, in_stock, description, short_description, display_name,
      image_override, featured, hidden
    )
    VALUES (
      (SELECT COALESCE(MAX(id), 0) + 1 FROM products),
      ${p.name},
      ${slugBase} || CASE WHEN EXISTS (SELECT 1 FROM products WHERE slug = ${slugBase})
        THEN '-' || (SELECT COALESCE(MAX(id), 0) + 1 FROM products)::text ELSE '' END,
      ${p.sku}, ${p.priceCents}, ${p.regularCents},
      ${p.regularCents > p.priceCents}, 'EUR', ${JSON.stringify(p.images)}::jsonb,
      ${p.inStock}, ${p.description}, ${p.shortDescription}, ${p.displayName},
      ${p.imageOverride}, ${p.featured}, ${p.hidden}
    )
    RETURNING id
  `) as { id: number }[];

  await syncProductCategories(rows[0].id, parseCategoryIds(formData));
  revalidateCatalog();
  redirect(`/admin/produktet/${rows[0].id}?krijuar=1`);
}

export async function updateProductAction(
  _prev: AdminFormState,
  formData: FormData
): Promise<AdminFormState> {
  await requireAdmin();
  const id = Number(formData.get("id"));
  if (!Number.isInteger(id)) return { error: "ID e pavlefshme." };
  const result = productFromForm(formData);
  if ("fieldErrors" in result) return { fieldErrors: result.fieldErrors };
  const p = result.data;

  await sql`
    UPDATE products SET
      name = ${p.name}, sku = ${p.sku}, price_cents = ${p.priceCents},
      regular_cents = ${p.regularCents}, on_sale = ${p.regularCents > p.priceCents},
      images = ${JSON.stringify(p.images)}::jsonb, in_stock = ${p.inStock},
      description = ${p.description}, short_description = ${p.shortDescription},
      display_name = ${p.displayName}, image_override = ${p.imageOverride},
      featured = ${p.featured}, hidden = ${p.hidden}, updated_at = now()
    WHERE id = ${id}
  `;
  await syncProductCategories(id, parseCategoryIds(formData));
  revalidateCatalog();
  return { success: "Produkti u ruajt." };
}

export async function toggleProductFlagAction(formData: FormData): Promise<void> {
  await requireAdmin();
  const id = Number(formData.get("id"));
  const flag = String(formData.get("flag"));
  if (!Number.isInteger(id)) return;
  if (flag === "featured") {
    await sql`UPDATE products SET featured = NOT featured, updated_at = now() WHERE id = ${id}`;
  } else if (flag === "hidden") {
    await sql`UPDATE products SET hidden = NOT hidden, updated_at = now() WHERE id = ${id}`;
  } else if (flag === "inStock") {
    await sql`UPDATE products SET in_stock = NOT in_stock, updated_at = now() WHERE id = ${id}`;
  }
  revalidateCatalog();
}

export async function deleteProductAction(formData: FormData): Promise<void> {
  await requireAdmin();
  const id = Number(formData.get("id"));
  if (!Number.isInteger(id)) return;
  await sql`DELETE FROM products WHERE id = ${id}`;
  revalidateCatalog();
  redirect("/admin/produktet");
}

/* ------------------------------ Messages -------------------------------- */

export async function markMessageReadAction(formData: FormData): Promise<void> {
  await requireAdmin();
  const id = Number(formData.get("id"));
  if (!Number.isInteger(id)) return;
  // With unread=1 the button un-reads the message again.
  const markUnread = formData.get("unread") === "1";
  await sql`UPDATE contact_messages SET is_read = ${!markUnread} WHERE id = ${id}`;
  revalidatePath("/admin/mesazhet");
  revalidatePath("/admin");
}

export async function deleteMessageAction(formData: FormData): Promise<void> {
  await requireAdmin();
  const id = Number(formData.get("id"));
  if (!Number.isInteger(id)) return;
  await sql`DELETE FROM contact_messages WHERE id = ${id}`;
  revalidatePath("/admin/mesazhet");
  revalidatePath("/admin");
}

/* ---------------------------- Access helper ------------------------------ */

/** Used by the login page to bounce already-authenticated admins to /admin. */
export async function redirectIfAdmin(): Promise<void> {
  const session = await getSession();
  if (isAdmin(session)) redirect("/admin");
}
