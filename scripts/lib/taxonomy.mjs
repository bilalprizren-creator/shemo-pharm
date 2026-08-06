/**
 * Tree maths shared by every script that touches the category taxonomy.
 *
 * The descendant-aware count in particular used to exist three times — once as
 * SQL in src/lib/admin-actions.ts and twice as JavaScript, in fix-categories.mjs
 * and restructure-categories.mjs. Three copies of a definition that gates
 * whether a category appears in the navigation at all (`count > 0`) is three
 * chances to silently drop a category off the site.
 */

/** Children by parent id, plus a fast id lookup. */
export function index(categories) {
  const byId = new Map(categories.map((c) => [c.id, c]));
  const childrenOf = new Map();
  for (const c of categories) {
    if (!childrenOf.has(c.parent)) childrenOf.set(c.parent, []);
    childrenOf.get(c.parent).push(c);
  }
  return { byId, childrenOf };
}

/** The category itself plus everything below it. */
export function withDescendants(id, childrenOf, depth = 0) {
  const out = [id];
  if (depth > 10) return out; // insurance against a cycle in `parent`
  for (const child of childrenOf.get(id) ?? []) {
    out.push(...withDescendants(child.id, childrenOf, depth + 1));
  }
  return out;
}

/** Ancestors from the nearest parent up to the root, root last. */
export function ancestors(id, byId) {
  const out = [];
  let node = byId.get(id);
  let hops = 0;
  while (node && node.parent !== 0 && hops++ < 10) {
    node = byId.get(node.parent);
    if (node) out.push(node.id);
  }
  return out;
}

/** Throws on anything that would corrupt the tree. */
export function assertTree(categories) {
  const problems = [];
  const seenId = new Set();
  const seenSlug = new Set();
  for (const c of categories) {
    if (seenId.has(c.id)) problems.push(`duplicate id ${c.id}`);
    if (seenSlug.has(c.slug)) problems.push(`duplicate slug ${c.slug}`);
    seenId.add(c.id);
    seenSlug.add(c.slug);
    if (c.kind !== "type" && c.kind !== "brand") {
      problems.push(`${c.slug}: kind must be type or brand, got ${c.kind}`);
    }
  }
  const { byId } = index(categories);
  for (const c of categories) {
    if (c.parent !== 0 && !byId.has(c.parent)) {
      problems.push(`${c.slug}: parent ${c.parent} does not exist`);
    }
  }
  for (const c of categories) {
    let node = c;
    let hops = 0;
    while (node && node.parent !== 0) {
      if (++hops > 10) {
        problems.push(`${c.slug}: parent chain does not terminate`);
        break;
      }
      node = byId.get(node.parent);
    }
  }
  if (problems.length) throw new Error("taxonomy is not a tree:\n  " + problems.join("\n  "));
}

/**
 * A product counts for a category when it is linked to that category OR to any
 * descendant of it — the same rule the SQL recount in admin-actions.ts applies
 * and the same one browsing uses (catalog.ts categoryIdWithDescendants), so a
 * parent's number matches what clicking it actually lists. Counted once per
 * category even when a product is linked to both a parent and its child.
 */
export function countProducts(categories, products) {
  const { childrenOf } = index(categories);
  const counts = new Map();
  for (const c of categories) {
    const subtree = new Set(withDescendants(c.id, childrenOf));
    let n = 0;
    for (const p of products) {
      if (p.categoryIds.some((id) => subtree.has(id))) n++;
    }
    counts.set(c.id, n);
  }
  return counts;
}

/**
 * The category ids to store on a product, in the order the UI reads them.
 *
 * Order is load-bearing, not cosmetic: catalog.ts toCardProducts labels a card
 * with the first id it can resolve, so the primary leaf has to come first for a
 * card to say "Kujdesi i buzëve" instead of "Kozmetikë". Ancestors follow so
 * that browsing a parent finds the product, then the secondary types, then the
 * brand last — a brand is never what a product *is*.
 */
export function orderedCategoryIds({ type, alsoTypes = [], brand }, bySlug, byId) {
  const out = [];
  const push = (id) => {
    if (id != null && !out.includes(id)) out.push(id);
  };
  const addWithAncestors = (slug) => {
    const cat = bySlug.get(slug);
    if (!cat) return;
    push(cat.id);
    for (const a of ancestors(cat.id, byId)) push(a);
  };

  addWithAncestors(type);
  for (const t of alsoTypes) addWithAncestors(t);
  if (brand) push(bySlug.get(brand)?.id);
  return out;
}
