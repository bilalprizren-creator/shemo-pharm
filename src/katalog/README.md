# shemo-katalog.com — the printed catalogue site

A second website, on its own domain, served by this same deployment. It is the
paper catalogue the company hands to partners, rebuilt as pages: the same 63
numbered sections in the same printed order, the same article codes, and a
print sheet that reproduces the A4 geometry.

Everything in this folder belongs to that site and to nothing else. The shop's
own product listing — `CatalogView`, `CategoryFilter`, `BrandTypeFilter`,
`SortSelect`, `CatalogSearch` — stays in `src/components/catalog/`, which is
why that folder and this one have such similar names and why the split is worth
keeping straight: *catalog* is the shop's grid of products, *katalog* is this
site.

## One deployment, two sites

The hostname decides, and nothing else does. `src/proxy.ts` reads it, resolves
it through `modeForHost()` and passes the answer on as the `x-site` request
header; server components read it back with `getSiteMode()`. The hosts that map
here are listed in `KATALOG_HOSTS` — a host that list does not know falls
through to the shop.

That file, `src/lib/site-mode.ts`, is deliberately **not** in this folder: it
decides between both sites and is read by the proxy, the shop's layout, the
sitemap and `ProductCard`. It is the first thing to read after this file.

Sharing one codebase is the whole point. Hiding a product or changing a price
in `/admin` takes effect on both sites at once. A second project reading the
same database would duplicate the layout, the translations, the login and the
image pipeline, and leave two admin surfaces to keep in step.

## URLs

On a catalogue host the site *is* the catalogue, so its pages sit at the root —
the domain already says "katalog" and need not repeat it in every URL. The
proxy folds the path under `/katalog` on the way in; `sitePath()` takes it back
out when rendering links.

| Address bar | Route | Rendered by |
|---|---|---|
| `/` | `app/[lang]/katalog/page.tsx` | `SectionIndex.tsx` |
| `/6-7-cansin` | `app/[lang]/katalog/[seksioni]/page.tsx` | `SectionView.tsx` |
| `/te-gjitha` | `app/[lang]/katalog/te-gjitha/page.tsx` | `AllProducts.tsx` |
| `/shtyp` | `app/[lang]/katalog/shtyp/page.tsx` | `PrintSheets.tsx` |
| `/kerko` | `app/[lang]/kerko/page.tsx` | `SearchResults.tsx` |

English lives under a visible `/en` on both sites, as everywhere else.

**The trap:** any real route that is not a section slug must be listed in
`SHARED_PATHS` (`src/lib/site-mode.ts`), or the mapping turns its path into a
section slug that does not exist and it 404s. That list is why the partner
login, the contact page and the legal pages work here. `/kerko` is in it too,
even though it exists only on this site.

## What this site does not have

No basket, no wishlist, no product pages, no offers, no category menu. The
cards are plain text rather than links, because the paper edition has no detail
view either and the job here is looking a code up. `KatalogHeader` and
`KatalogFooter` carry that stripped-down chrome, and `src/app/[lang]/layout.tsx`
leaves the cart and wishlist providers out entirely on this branch — a
`CartProvider` on a site with no cart fetches an empty basket on every page view.

Prices are the exception: they are the same prices as the shop, behind the same
partner login, because that is what a partner comes here for.

## The print sheet

`/shtyp` is the whole PDF pipeline — no Puppeteer, no stored file, nothing that
can go stale against the database. The browser's own "Save as PDF" does the rest.

Three numbers govern it, and each one has a rule attached:

- **163 A4 sheets** for the full run. `sheets.ts` is the arithmetic, exported on
  its own so the contents page and the section page can print the count in the
  button *before* someone commits to it. `?seksioni=<slug>` limits the run to
  one section, which is what most people actually want.
- **1 733 photos, all eager.** An image the browser has not fetched prints as
  blank space, and a print run never scrolls to trigger lazy loading. So
  `PrintButton` waits: the click queues, and the dialog opens only once every
  image has settled. Never call `window.print()` here without that wait.
- **`width={192}`** on the sheet image, not the 30mm the box is drawn at.
  `next/image` builds a 1x/2x srcset off that number: 192 lands on 256/384
  where 220 landed on 256/**640**. Raising it costs a third variant on Vercel's
  transformation quota for every one of the 1 733 photos, and buys nothing —
  384px across 30mm is already 325 dpi.

No prices on the sheet, by decision. The paper edition carries none either, and
a price printed onto a sheet that lives in a customer's drawer for a year is
worse than no price at all.

The geometry itself is CSS, in the `Printed catalogue` block of
`src/app/globals.css`. The old site drew the same thing with a 1600x2263 PNG
behind every one of its 174 pages.

## Editing it

The catalogue is edited from the shop's own admin, at `/admin/katalogu` — one
panel for both sites, which is the point of the arrangement. The sections list
is the whole `catalog_sections` table in printed order, including the sections
the public site drops for being empty, with a count of what sits in each and a
badge on the ones that therefore do not appear. Opening a section gives its
products in printed order, a step up and a step down per row, a search box that
places a product at the end of the section, and an × that takes it out of the
catalogue without touching the shop.

Three rules are enforced there rather than left to care:

- **A section is deleted only when empty.** `products.catalog_section_id` is
  `ON DELETE SET NULL`, so deleting a full one would quietly empty it into
  nowhere. The row hides the button and the action re-checks.
- **The slug is checked, not just the pair.** `catalog_sections` is unique on
  (`catalog_no`, `name`), but the address bar sees `catalogSectionSlug()` of
  that pair, and two legal rows can share one slug — after which
  `getCatalogSectionBySlug()` hands every visit to whichever came first.
- **Every move renumbers the section 1..n**, in one `unnest` update. Positions
  arrived from the import 0-based and with ties in them, and swapping two equal
  numbers moves nothing. The section page offers a *Rinumëro* button exactly
  when ties are left, because that is the case where the printed order is
  decided by an id rather than by a person.

Placement is also on the product form (`/admin/produktet/<id>`), which is the
right place for one product; this is the right place for the running order.
`/admin/produktet?seksioni=pa-seksion` lists the 311 that were never printed.

## Two sites, two visibilities

`products.hidden` hides from the shop. `products.catalog_hidden` hides from
this site. Neither is derived from the other, because they answer different
questions: an article the shop has stopped selling can be worth leaving in the
catalogue a partner is holding on paper, and a shop listing can be something the
print run has no room for.

`fetchCatalog()` therefore loads `hidden = false OR catalog_hidden = false` and
splits the result on the way in: `products` still means *visible in the shop* —
so the shop's twenty-odd readers of it did not change and cannot leak — and
`catalogOnly` holds the other direction. `printedProducts()` puts them back
together for exactly three functions: `getCatalogSections()`,
`getEmptyCatalogSections()` and `getAllProductsInCatalogOrder()`. Every page of
this site reads one of those three, `/kerko` and `/shtyp` included, so that is
the whole surface.

A section whose products are all `catalog_hidden` disappears from the site the
same way an empty one does — `getCatalogSections()` drops it — which is why the
admin list counts *printed*, not *sold*, and flags the difference.

## Open points

- **The domain has not moved.** `shemo-katalog.com` still resolves to Hostinger,
  i.e. the old WordPress site. Nothing here is live until it points at Vercel.
  The two redirects the old site needs (`/index.php`, `/login.php`) are already
  in `next.config.ts`.
- **176 printed articles are not in the database**, listed one by one in
  `audit/catalog-order-import.md`. Nobody has decided yet whether they are
  discontinued or simply missing from the shop.
- **Two printed sections are therefore empty** — 38 Denk Pharma and 7.3 Ivy Bear
  — which is why the site shows 61 sections against the paper edition's 63. The
  contents page says so, using `getEmptyCatalogSections()`; it reads the section
  table rather than a hard-coded list, so it corrects itself as articles arrive.
- **311 products were never printed.** They are not hidden: `/te-gjitha` lists
  the whole range in printed order with those at the end under their own
  heading. `/kerko` deliberately searches only the printed ones, because the
  code somebody types comes off a printed page.
