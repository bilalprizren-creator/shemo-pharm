"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { after } from "next/server";
import { redirect } from "next/navigation";
import { z } from "zod";
import {
  ADMIN_SESSION_DAYS,
  createSessionCookie,
  endSession,
  findUser,
  requireAdmin,
  verifyPassword,
  type Session,
} from "@/lib/auth";
import { logSecurityEvent } from "@/lib/security-log";
import { sql } from "@/lib/db";
import { CATALOG_TAG } from "@/lib/catalog-tag";
import { isAllowedImageSrc } from "@/lib/images";
import { parsePriceEuros } from "@/lib/price-input";
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

/**
 * A zod failure reduced to one message per field.
 *
 * First issue wins: a field with three complaints has room for one line under
 * it, and the first is the one that describes what was actually typed. Not
 * exported — every export of this file becomes a POST endpoint.
 */
function fieldErrorsFrom(error: {
  issues: readonly { readonly path: readonly PropertyKey[]; readonly message: string }[];
}): Record<string, string> {
  const fieldErrors: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? "form");
    if (!fieldErrors[key]) fieldErrors[key] = issue.message;
  }
  return fieldErrors;
}

/* ------------------------------- Auth ---------------------------------- */

export async function adminLoginAction(
  _prev: AdminFormState,
  formData: FormData
): Promise<AdminFormState> {
  // The admin password is the most valuable credential here — same ceiling as
  // the customer login, counted in its own bucket.
  if (await rateLimited("admin-auth", { limit: 10, windowMs: TEN_MINUTES_MS })) {
    await logSecurityEvent("admin-login-rate-limited");
    return { error: "Shumë tentativa. Provoni përsëri pas disa minutash." };
  }

  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  if (!email || !password) {
    return { error: "Plotësoni email-in dhe fjalëkalimin." };
  }

  const user = await findUser(email);
  if (!user || !verifyPassword(password, user.passwordHash)) {
    // The address is recorded, the password never is. One line per failure is
    // what makes a credential-stuffing run visible in the logs.
    await logSecurityEvent("admin-login-failed", { email });
    // Deliberately the same answer whether the address exists or the password
    // was wrong — the panel must not confirm which admin addresses are real.
    return { error: "Të dhëna të pasakta." };
  }
  if (user.role !== "admin") {
    await logSecurityEvent("admin-login-not-admin", { email });
    return { error: "Kjo llogari nuk ka qasje administratori." };
  }
  // Depth rather than a gate that was missing: role is what grants the panel, but
  // an account parked as pending has no business holding an admin session either.
  if (user.status !== "approved") {
    await logSecurityEvent("admin-login-not-admin", { email, reason: "not approved" });
    return { error: "Kjo llogari nuk ka qasje administratori." };
  }

  // A day, not the customer's week: this cookie opens the panel that can delete
  // the catalogue, and the panel is used a few times a week.
  await createSessionCookie(user, { days: ADMIN_SESSION_DAYS });
  await logSecurityEvent("admin-login", { email });
  redirect("/admin");
}

export async function adminLogoutAction(): Promise<void> {
  // endSession, not clearSessionCookie: deleting the browser's copy leaves any
  // other copy of the cookie working until it expires on its own.
  await logSecurityEvent("admin-logout");
  await endSession();
  redirect("/admin/login");
}

/* ------------------------------ Audit trail ------------------------------ */

/**
 * Records a mutation that changed who can do what, or destroyed something.
 *
 * Not every action here: toggling "featured" is noise, and a log nobody can read
 * because of the volume is worse than none. What is recorded is the set where the
 * question "who did this, and when" has an actual answer somebody would want —
 * account approvals and deletions, product writes and deletions, and anything
 * that removes a row.
 */
async function logMutation(
  admin: Session,
  action: string,
  detail: Record<string, string | number | boolean | null | undefined> = {}
): Promise<void> {
  await logSecurityEvent("admin-mutation", { by: admin.email, action, ...detail });
}

/* --------------------------- User approvals ----------------------------- */

export async function approveUserAction(formData: FormData): Promise<void> {
  const admin = await requireAdmin();
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
    await logMutation(admin, "approve-user", { userId: id, email: user.email });
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
  const admin = await requireAdmin();
  const id = Number(formData.get("id"));
  if (!Number.isInteger(id)) return;
  await sql`
    UPDATE users SET status = 'pending' WHERE id = ${id} AND role = 'customer'
  `;
  await logMutation(admin, "revoke-user", { userId: id });
  revalidatePath("/admin/kerkesat");
  revalidatePath("/admin");
}

/** Rejecting a request deletes the account — customers only, never admins. */
export async function rejectUserAction(formData: FormData): Promise<void> {
  const admin = await requireAdmin();
  const id = Number(formData.get("id"));
  if (!Number.isInteger(id)) return;
  await sql`DELETE FROM users WHERE id = ${id} AND role = 'customer'`;
  await logMutation(admin, "delete-user", { userId: id });
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

/**
 * Replaces a product's category links.
 *
 * The two statements go in one transaction because the first destroys what the
 * second restores: a DELETE that lands while the INSERT does not leaves the
 * product in no category at all, and the recount that follows would write that
 * loss into every ancestor's count. The neon HTTP driver takes an array of
 * un-awaited queries and sends them as a single non-interactive transaction.
 */
async function syncProductCategories(
  productId: number,
  categoryIds: number[]
): Promise<void> {
  await sql.transaction([
    sql`DELETE FROM product_categories WHERE product_id = ${productId}`,
    ...(categoryIds.length
      ? [
          sql`
            INSERT INTO product_categories (product_id, category_id)
            SELECT ${productId}, id FROM categories WHERE id = ANY(${categoryIds})
            ON CONFLICT DO NOTHING
          `,
        ]
      : []),
  ]);
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
    return { fieldErrors: fieldErrorsFrom(parsed.error) } as const;
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

/**
 * Drops the cached catalog and refreshes the admin views.
 *
 * Public pages are dynamic (they read the session cookie), but the catalog
 * behind them is cached across requests — without this, an edit would sit
 * invisible until the revalidate window ran out. `expire: 0` rather than the
 * "max" profile on purpose: "max" serves the stale copy while it refreshes in
 * the background, and an editor who just pressed Save and opens the public
 * page must not be shown the version they replaced. Traffic here is far too
 * low for the blocking refetch to matter.
 */
function revalidateCatalog(): void {
  revalidateTag(CATALOG_TAG, { expire: 0 });
  revalidatePath("/admin/produktet");
  revalidatePath("/admin");
}

export async function createProductAction(
  _prev: AdminFormState,
  formData: FormData
): Promise<AdminFormState> {
  const admin = await requireAdmin();
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
  await logMutation(admin, "create-product", { productId: rows[0].id, name: p.name });
  revalidateCatalog();
  redirect(`/admin/produktet/${rows[0].id}?krijuar=1`);
}

export async function updateProductAction(
  _prev: AdminFormState,
  formData: FormData
): Promise<AdminFormState> {
  const admin = await requireAdmin();
  const id = Number(formData.get("id"));
  if (!Number.isInteger(id)) return { error: "ID e pavlefshme." };
  const result = productFromForm(formData);
  if ("fieldErrors" in result) return { fieldErrors: result.fieldErrors };
  const p = result.data;

  const updated = (await sql`
    UPDATE products SET
      name = ${p.name}, sku = ${p.sku}, price_cents = ${p.priceCents},
      regular_cents = ${p.regularCents}, on_sale = ${p.regularCents > p.priceCents},
      images = ${JSON.stringify(p.images)}::jsonb, in_stock = ${p.inStock},
      description = ${p.description}, short_description = ${p.shortDescription},
      display_name = ${p.displayName}, image_override = ${p.imageOverride},
      featured = ${p.featured}, hidden = ${p.hidden}, updated_at = now()
    WHERE id = ${id}
    RETURNING id
  `) as { id: number }[];
  // Without this the form answers "saved" for a product that is not there —
  // an id edited in the URL, or a row deleted in another tab — and then goes
  // on to write category links for it.
  if (updated.length === 0) return { error: "Produkti nuk u gjet." };

  await syncProductCategories(id, parseCategoryIds(formData));
  await logMutation(admin, "update-product", { productId: id, name: p.name });
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
    // recountCategories counts `hidden = false` only, so this button moves
    // every ancestor's total. Without the recount, hiding the last product of
    // a category leaves it advertised — count > 0 is what puts a category in
    // the nav, on /kategorite, on the homepage and in the sitemap.
    await recountCategories();
  } else if (flag === "inStock") {
    await sql`UPDATE products SET in_stock = NOT in_stock, updated_at = now() WHERE id = ${id}`;
  }
  revalidateCatalog();
}

/**
 * Changes one product's price straight from the list, without opening the form.
 *
 * The wholesale price is the only field this writes, but it cannot be written on
 * its own: `regular_cents` is the struck-through price and `on_sale` is derived
 * from the pair, so a bare price_cents update would leave a product advertised
 * as an offer at a price no longer below its regular one — or the reverse, a
 * price cut that never shows as a cut.
 *
 * The three assignments below reproduce exactly what productFromForm() computes
 * for the full form. Postgres evaluates every SET expression against the row as
 * it was, so `on_sale` reads the old regular_cents while regular_cents is itself
 * being raised — which is the same test as "new regular > new price".
 */
export async function updateProductPriceAction(
  _prev: AdminFormState,
  formData: FormData
): Promise<AdminFormState> {
  const admin = await requireAdmin();
  const id = Number(formData.get("id"));
  if (!Number.isInteger(id)) return { error: "ID e pavlefshme." };

  const cents = parsePriceEuros(formData.get("price"));
  // One message for every way the field can be wrong: the row has space for a
  // line, not for a taxonomy of what a price is.
  if (cents === null) {
    return { fieldErrors: { price: "Shkruani një çmim si 12,50." } };
  }

  const updated = (await sql`
    UPDATE products SET
      price_cents = ${cents},
      regular_cents = GREATEST(regular_cents, ${cents}),
      on_sale = regular_cents > ${cents},
      updated_at = now()
    WHERE id = ${id}
    RETURNING id
  `) as { id: number }[];
  // Same guard as updateProductAction: without it the row answers "saved" for a
  // product that is not there.
  if (updated.length === 0) return { error: "Produkti nuk u gjet." };

  // Unlike the flag toggles, this one is logged — a price is money, and it is
  // exactly the kind of change where "who did this, and when" has an answer
  // somebody will want.
  await logMutation(admin, "update-price", { productId: id, priceCents: cents });
  // No recountCategories(): only `hidden` and category links move those totals.
  revalidateCatalog();
  return { success: "U ruajt." };
}

export async function deleteProductAction(formData: FormData): Promise<void> {
  const admin = await requireAdmin();
  const id = Number(formData.get("id"));
  if (!Number.isInteger(id)) return;
  await sql`DELETE FROM products WHERE id = ${id}`;
  // The FK cascade drops the product_categories rows, but nothing recomputes
  // the counts those rows fed — every other product mutation reaches
  // recountCategories through syncProductCategories, and this one does not.
  await recountCategories();
  await logMutation(admin, "delete-product", { productId: id });
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
  const admin = await requireAdmin();
  const id = Number(formData.get("id"));
  if (!Number.isInteger(id)) return;
  await sql`DELETE FROM contact_messages WHERE id = ${id}`;
  await logMutation(admin, "delete-message", { messageId: id });
  revalidatePath("/admin/mesazhet");
  revalidatePath("/admin");
}

/* ----------------------------- Categories -------------------------------- */

/**
 * Category editing.
 *
 * There is no delete action, and that is deliberate: product_categories is
 * ON DELETE CASCADE, so removing a category row silently takes every
 * product↔category link with it. A category that should disappear from the
 * site gets its products moved and is left with a count of zero — which is
 * already how visibility is decided everywhere (count > 0 gates the nav, the
 * homepage, /kategorite and the sitemap). Actually dropping rows stays with
 * the migration scripts, which snapshot the tree before they touch it.
 */

const categorySchema = z.object({
  displayName: z.string().trim().max(120).optional().or(z.literal("")),
  sort: z.coerce.number().int().min(0).max(9999),
  parent: z.coerce.number().int().min(0),
  kind: z.enum(["type", "brand"]),
});

/** A category may not become its own ancestor — that would spin recountCategories. */
async function wouldCycle(id: number, parent: number): Promise<boolean> {
  if (parent === 0) return false;
  if (parent === id) return true;
  const rows = (await sql`
    WITH RECURSIVE up AS (
      SELECT id, parent, 0 AS depth FROM categories WHERE id = ${parent}
      UNION ALL
      SELECT c.id, c.parent, up.depth + 1
      FROM categories c JOIN up ON c.id = up.parent
      WHERE up.depth < 20
    )
    SELECT 1 AS hit FROM up WHERE id = ${id} LIMIT 1
  `) as { hit: number }[];
  return rows.length > 0;
}

export async function updateCategoryAction(
  _prev: AdminFormState,
  formData: FormData
): Promise<AdminFormState> {
  await requireAdmin();
  const id = Number(formData.get("id"));
  if (!Number.isInteger(id) || id <= 0) return { error: "ID e pavlefshme." };

  const parsed = categorySchema.safeParse({
    displayName: formData.get("displayName"),
    sort: formData.get("sort") || 0,
    parent: formData.get("parent") || 0,
    kind: formData.get("kind"),
  });
  if (!parsed.success) {
    return { fieldErrors: fieldErrorsFrom(parsed.error) };
  }
  const d = parsed.data;

  if (await wouldCycle(id, d.parent)) {
    return { error: "Kategoria nuk mund të vendoset nën vetveten." };
  }

  await sql`
    UPDATE categories
    SET display_name = ${d.displayName || null}, sort = ${d.sort},
        parent = ${d.parent}, kind = ${d.kind}
    WHERE id = ${id}
  `;
  // Moving a category changes which products count for which parent.
  await recountCategories();
  revalidateCatalog();
  revalidatePath("/admin/kategorite");
  return { success: "Kategoria u ruajt." };
}

export async function createCategoryAction(
  _prev: AdminFormState,
  formData: FormData
): Promise<AdminFormState> {
  await requireAdmin();

  const name = String(formData.get("name") ?? "").trim();
  if (name.length < 2) {
    return { fieldErrors: { name: "Emri duhet të ketë të paktën 2 shkronja." } };
  }
  const parsed = categorySchema.safeParse({
    displayName: formData.get("displayName"),
    sort: formData.get("sort") || 0,
    parent: formData.get("parent") || 0,
    kind: formData.get("kind") || "type",
  });
  if (!parsed.success) return { error: "Të dhëna të pavlefshme." };
  const d = parsed.data;

  const slugBase = slugify(name) || "kategori";
  const existing = (await sql`
    SELECT 1 AS hit FROM categories WHERE slug = ${slugBase} LIMIT 1
  `) as { hit: number }[];
  if (existing.length > 0) {
    return { fieldErrors: { name: "Ekziston tashmë një kategori me këtë emër." } };
  }

  // Ids are assigned by hand for the same reason products are: the table was
  // seeded from WooCommerce with its ids preserved and has no sequence.
  await sql`
    INSERT INTO categories (id, name, slug, parent, count, display_name, kind, sort)
    VALUES ((SELECT COALESCE(MAX(id), 0) + 1 FROM categories), ${name}, ${slugBase},
            ${d.parent}, 0, ${d.displayName || null}, ${d.kind}, ${d.sort})
  `;
  revalidateCatalog();
  revalidatePath("/admin/kategorite");
  return { success: `Kategoria "${name}" u krijua.` };
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
  const admin = await requireAdmin();
  const id = Number(formData.get("id"));
  if (!Number.isInteger(id)) return;
  await sql`DELETE FROM orders WHERE id = ${id}`;
  await logMutation(admin, "delete-order", { orderId: id });
  revalidatePath("/admin/porosite");
  revalidatePath("/admin");
}

// There was a redirectIfAdmin() here, exported and called by nobody — the login
// page inlines the same two lines. Every export of a "use server" file becomes a
// POST-reachable endpoint, so an unused one is attack surface bought for nothing.
