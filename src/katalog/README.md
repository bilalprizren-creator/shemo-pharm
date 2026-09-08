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
| `/kerko` | `app/[lang]/katalog/kerko/page.tsx` | `SearchResults.tsx` |

English lives under a visible `/en` on both sites, as everywhere else.

**The trap:** any real route that is not a section slug must be listed in
`SHARED_PATHS` (`src/lib/site-mode.ts`), or the mapping turns its path into a
section slug that does not exist and it 404s. That list is why the partner
login, the contact page and the legal pages work here.

`/kerko` used to be in that list, and should not have been. Being shared kept
it off `/katalog` on the shop's domain — which is where this site is actually
read until `shemo-katalog.com` moves — so the catalogue there had no search of
its own and its search button pointed at `/produktet`, dropping the reader into
the shop's listing over the shop's range. It is a catalogue page like the rest
now: `/katalog/kerko` on the shop's domain, `/kerko` here, one route.

## What this site does not have

No basket, no wishlist, no product pages, no offers, no category menu. The
cards are plain text rather than links, because the paper edition has no detail
view either and the job here is looking a code up. `KatalogHeader` and
`KatalogFooter` carry that stripped-down chrome, and `src/app/[lang]/layout.tsx`
leaves the cart and wishlist providers out entirely on this branch — a
`CartProvider` on a site with no cart fetches an empty basket on every page view.

Prices are the exception: they are the same prices as the shop, behind the same
partner login, because that is what a partner comes here for.

## The print sheet, and the PDF

`/shtyp` used to be the whole PDF pipeline: no stored file, nothing that could
go stale, the browser's own "Save as PDF" doing the rest. It did not hold. A
full run made the visitor's browser fetch 1 713 photographs — 69 MB of
originals — and then typeset 163 A4 pages, which on two different laptops took
long enough that the feature was not usable. The work is the same work whoever
does it; the mistake was doing it once per visitor.

So there are now two things, and the split matters:

- **`scripts/build-catalog-pdf.mjs`** renders `/shtyp` in Playwright's Chromium,
  once, offline, and writes `public/pdf/shemo-katalog-<month>.pdf` plus one file
  per section. That is what the buttons link to. Chromium is a devDependency and
  is never deployed. Run it against a server holding the **production** database
  — the catalogue is edited in `/admin/katalogu` against live data.
- **`/shtyp` itself stays**, because it is the only version that is current to
  the minute, and because one section is a perfectly cheap thing to print from
  a browser. It is the second button everywhere now, not the first.

The stored file can go stale, which is exactly what the old arrangement was
avoiding, so it is watched: `catalogFingerprint()` in `sheets.ts` hashes what a
sheet actually prints, `PrintSheets` puts it on the page as `data-fingerprint`,
the script records it in `src/data/catalog-pdf.json`, and the contents page says
so when today's no longer matches. `src/katalog/pdf.ts` reads that manifest and
every caller tolerates it being empty — a checkout before the first run is a
real state, not a broken one.

It is a strict hash: one renamed product, one replaced photograph, one reordered
section and the note is on. That is deliberate — the alternative is a warning
that is right on average and wrong about the article somebody is holding — but
it does mean the note appears often while the catalogue is being edited, and the
answer to it is always the same:

```
npm run katalog:pdf -- --base https://shemo-pharm.vercel.app
git add public/pdf src/data/catalog-pdf.json && git commit && git push
```

Twenty minutes, unattended. Do it after a run of catalogue edits, not during
one: it renders the live site sixty-two times and will happily photograph a
half-finished reordering.

**Do not point `--base` at a local server on the development database.** It will
work, produce a plausible catalogue, and publish a range nobody sells; the
fingerprint mismatch on the contents page is the only thing that would say so.

Four numbers govern the sheet, and each one has a rule attached. They move as
the range does — 162 sheets and 1 713 photographs on 8 September 2026, against
the 163 and 1 733 the development database still shows — so read them as scale,
not as constants. `sheetsFor()` is the only thing that knows the real count.

- **162 A4 sheets** for the full run. `sheets.ts` is the arithmetic, exported on
  its own so the contents page and the section page can print the count in the
  button *before* someone commits to it. `?seksioni=<slug>` limits the run to
  one section, which is what most people actually want; an unknown slug is
  not-found rather than the whole run, which is what it used to be.
- **1 713 photos, all eager.** An image the browser has not fetched prints as
  blank space, and a print run never scrolls to trigger lazy loading. So
  `PrintButton` waits: the click queues, and the dialog opens only once every
  image has settled. Never call `window.print()` here without that wait — and
  `build-catalog-pdf.mjs` waits on the same condition, because `page.pdf()`
  freezes the page as it stands.
- **384px JPEG on white** — `printImageFor()`, not `thumbnailFor()`. Half the
  pixels of the 560px thumbnail and still 325 dpi across the 30mm box, which
  took the full run from 69 MB to 17.5 MB.

  The JPEG is not a preference. Chrome can carry a picture into a PDF untouched
  only when it is already JPEG; anything else it decodes and stores Flate,
  losslessly. Measured on 60 of these files at 384px: JPEG, 642 KB in and a
  657 KB PDF out; WebP, 451 KB in and a 5 999 KB PDF out. The first run of
  `build-catalog-pdf.mjs` produced a **183.8 MB** catalogue out of WebP sheets.
  WebP would save the print *page* about 5 MB, and that is the wrong side to
  optimise now. The flattening onto white follows from the JPEG — a JPEG has no
  alpha and every cut-out has one.
- **`width={192}`** on the sheet image, which now only sizes the box.
  `images.unoptimized` is on, so `next/image` builds no srcset off it and the
  browser fetches exactly the file `src` names. Leave it: the number still has
  to be the right one the day the optimizer comes back.

`next.config.ts` also gives `/products/**` a day of `Cache-Control` and
`/pdf/**` a year of `immutable`. Both matter here more than anywhere else on the
site — without the first, every print run revalidated 1 713 files one by one.

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
