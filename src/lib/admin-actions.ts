"use server";

import { revalidatePath } from "next/cache";
import { after } from "next/server";
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
import { isAllowedImageSrc } from "@/lib/images";
import { rateLimited, TEN_MINUTES_MS } from "@/lib/rate-limit";
import { sendMail, siteOrigin } from "@/lib/mail";
import { accountApprovedMessage } from "@/lib/mail-templates";
import { getDictionary } from "@/lib/dictionaries";
import { isLang, langHref, type Lang } from "@/lib/i18n";

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
  // The admin password is the most valuable credential here — same ceiling as
  // the customer login, counted in its own bucket.
  if (await rateLimited("admin-auth", { limit: 10, windowMs: TEN_MINUTES_MS })) {
    return { error: "Shumë tentativa. Provoni përsëri pas disa minutash." };
  }

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

  // Conditional on the status actually changing, so pressing Approve twice
  // does not mail the customer twice. RETURNING gives us who to write to.
  const rows = (await sql`
    UPDATE users SET status = 'approved'
    WHERE id = ${id} AND role = 'customer' AND status <> 'approved'
    RETURNING email, name, lang
  `) as { email: string; name: string; lang: string | null }[];

  const user = rows[0];
  if (user) {
    const dict = getDictionary(isLang(user.lang ?? "") ? (user.lang as Lang) : "sq");
    after(async () => {
      await sendMail(
        accountApprovedMessage({
          dict,
          name: user.name,
          to: user.email,
          url: `${siteOrigin()}${langHref(dict.lang, "/produktet")}`,
        })
      );
    });
  }

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

/**
 * Only hosts next/image is configured for — anything else would throw while
 * rendering the public product page instead of just showing a broken picture.
 */
const IMAGE_SRC_ERROR =
  "Lejohen vetëm foto nga shemopharm.com ose shtigje si /products/foto.png";

const imageLines = (raw: string): string[] =>
  raw
    .split(/\r?\n/)
    .map((s) => s.trim())
    .filter(Boolean);

const productSchema = z.object({
  name: z.string().trim().min(2, "Emri duhet të ketë të paktën 2 shkronja."),
  sku: z.string().trim().max(40).optional().or(z.literal("")),
  price: z.coerce.number().min(0, "Çmimi nuk mund të jetë negativ."),
  regularPrice: z.coerce.number().min(0).optional(),
  inStock: z.coerce.boolean(),
  featured: z.coerce.boolean(),
  hidden: z.coerce.boolean(),
  displayName: z.string().trim().max(200).optional().or(z.literal("")),
  imageOverride: z
    .string()
    .trim()
    .max(500)
    .refine((v) => !v || isAllowedImageSrc(v), IMAGE_SRC_ERROR)
    .optional()
    .or(z.literal("")),
  images: z
    .string()
    .max(5000)
    .refine((v) => imageLines(v).every(isAllowedImageSrc), IMAGE_SRC_ERROR)
    .optional()
    .or(z.literal("")),
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
  return imageLines(raw).filter(isAllowedImageSrc).slice(0, 10);
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
  await recountCategories();
}

/**
 * Recompute every category's product count.
 *
 * A product counts for a category if it is tagged on that category OR on any
 * descendant of it — the same definition scripts/fix-categories.mjs writes, and
 * the one the site reads: browsing a category lists its whole subtree
 * (catalog.ts categoryIdWithDescendants). Counting only direct links would
 * collapse every parent (kozmetike 481 -> 280) and, since `count > 0` gates
 * visibility in the nav, homepage, /kategorite and the sitemap, drop categories
 * out of the UI.
 *
 * Each product is counted once per category even when tagged on both the parent
 * and one of its children (805 of 2049 products sit in several branches), hence
 * count(DISTINCT p.id). The depth guard is insurance: a cycle in `parent` would
 * otherwise make the recursion run forever inside an admin save.
 */
async function recountCategories(): Promise<void> {
  await sql`
    WITH RECURSIVE subtree AS (
      SELECT id AS root, id AS node, 0 AS depth FROM categories
      UNION ALL
      SELECT s.root, c.id, s.depth + 1
      FROM subtree s
      JOIN categories c ON c.parent = s.node
      WHERE s.depth < 10
    ), tallied AS (
      SELECT s.root AS id, count(DISTINCT p.id)::int AS n
      FROM subtree s
      LEFT JOIN product_categories pc ON pc.category_id = s.node
      LEFT JOIN products p ON p.id = pc.product_id AND p.hidden = false
      GROUP BY s.root
    )
    UPDATE categories c SET count = t.n
    FROM tallied t
    WHERE c.id = t.id AND c.count IS DISTINCT FROM t.n
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

/* ------------------------------- Orders ---------------------------------- */

export async function markOrderHandledAction(formData: FormData): Promise<void> {
  await requireAdmin();
  const id = Number(formData.get("id"));
  if (!Number.isInteger(id)) return;
  // With unhandled=1 the button reopens the order.
  const markUnhandled = formData.get("unhandled") === "1";
  await sql`UPDATE orders SET is_handled = ${!markUnhandled} WHERE id = ${id}`;
  revalidatePath("/admin/porosite");
  revalidatePath("/admin");
}

export async function deleteOrderAction(formData: FormData): Promise<void> {
  await requireAdmin();
  const id = Number(formData.get("id"));
  if (!Number.isInteger(id)) return;
  await sql`DELETE FROM orders WHERE id = ${id}`;
  revalidatePath("/admin/porosite");
  revalidatePath("/admin");
}

/* ---------------------------- Access helper ------------------------------ */

/** Used by the login page to bounce already-authenticated admins to /admin. */
export async function redirectIfAdmin(): Promise<void> {
  const session = await getSession();
  if (isAdmin(session)) redirect("/admin");
}
