# Category audit — state and how to resume

Every product in the catalog is being reclassified from its own package photo against
the closed vocabulary in `src/data/taxonomy.json`. This folder holds the work.

**Why photos and not the existing categories:** the WooCommerce categories are shelf
buckets that mix brands with product types, only 22 of 2049 products carry a
description, and the upstream Store API now answers 401. The packshot is the only
remaining evidence of what a product actually is. It keeps proving the point — nine
products named "Gaza sterile" are photographed as Cansin wound dressings, "Katena
100mg" is a tyrosine supplement while "Katena 300mg" is gabapentin, and every product
named "Labella" or "Palloma" turns out to be some other brand entirely.

## Where it stands

| | |
|---|---|
| Classified | **2049 of 2049** — batches 001–041, complete |
| Remaining | none |
| Validator | 0 problems |
| To re-check by hand | 97 low confidence, 8 parked on a bare root by choice |
| Applied to `src/data/*.json` | **yes** — assignments, categories and products |
| Applied to the database | **not yet** |

## Layout

```
audit/
  RULES.md        the closed vocabulary + judgement calls. Every agent reads this first.
  PRECEDENTS.md   case law built up over 1750 products. Read second. Keeps batch N+1
                  from filing the same product somewhere else than batch N did.
  batches/        input, 50 products each: id, sku, name, and a path to the thumbnail
  out/            one verdict per product — THE IRREPLACEABLE PART
  thumbs/         gitignored, 30 MB, rebuilt from public/products/ in about a minute
```

## Resuming on another machine

```bash
node scripts/audit-thumbnails.mjs
```

That rebuilds `audit/thumbs/` from `public/products/`, which is exactly where
`audit/batches/*.json` point. Nothing else needs restoring. Needed again only
to re-open a photo during review — no batch is waiting to be classified.

<details>
<summary>The brief each batch was classified under (kept for re-runs)</summary>

> Read `audit/RULES.md` in full, then `audit/PRECEDENTS.md` in full, then
> `audit/batches/batch-0NN.json`. For EVERY product, open the `image` path with the
> Read tool and look at the package — the photo is the evidence, the name is only a
> hint and is often wrong. Write `audit/out/batch-0NN.json`: one object per product,
> same order, `{id, type, alsoTypes, brand, confidence, note}`. `type` is exactly one
> slug from RULES.md, the deepest leaf that fits. `brand` only when the mark is
> legible in the photo — never inferred from an article code or the name, since codes
> are applied afterwards by a deterministic rule. Write the file incrementally every
> ~10 products so an interruption does not lose the batch.

</details>

The gate, which currently reports `classified: 2049 of 2049` and `problems: 0`:

```bash
node scripts/merge-audit.mjs audit/out
```

## What has run

```bash
node scripts/pin-brands.mjs                      # -> src/data/brand-pins.json
node scripts/merge-audit.mjs audit/out --write   # -> src/data/catalog-assignments.json
node scripts/apply-taxonomy.mjs --json-only      # -> src/data/{categories,products}.json
```

`categories.json` went 90 → 111 and the product links 3727 → 5264. Only `corape`
and `antibakterial` end at `count = 0`.

## Next — the database

```bash
node scripts/snapshot-categories.mjs             # rollback file, take it first
node scripts/apply-taxonomy.mjs                  # dry run against the current DB
node scripts/apply-taxonomy.mjs --commit         # live edit
```

**`.env.local` points at the same Neon database as production**, so `--commit` is a
live edit. Deploy the reading code before migrating the data, not after — and keep
the gap short: `src/lib/catalog.ts` now names the post-migration slug `suplemente`
for its homepage card, which until the migration resolves to the old child category
(203 products instead of 398). Nothing breaks, but the card undercounts.

Two products still want `hidden = true` rather than a category: the printed pharmacy
carrier bags, ids 9575 and 14337. That is a database flag, so it is a toggle in
`/admin/produktet` after the migration, not something the JSON pass could do.

## What `merge-audit.mjs` decides on its own

Four things are derived deterministically rather than left to per-batch judgement,
because an LLM applying the same rule 2049 times will not apply it the same way twice:

1. **Brand from article code**, filling only what the photo audit left `null`. Each
   pattern was measured against the catalog before being trusted — `REF-###` is Ersa
   Med in 41 of 41 cases, `ERS-` in 16 of 16, `SL-`/`SLP-` in 50 of 51. RULES.md's
   claim that Ersa uses `S####` codes is **wrong**: none of those 11 products are Ersa,
   so that pattern is deliberately absent.
2. **`per-femije` for children's brands** whose type sits outside the children's
   branch. A Disney toothbrush is `dentare`, which hangs under Kozmetikë, so without
   this it appears under "Për fëmijë" or not depending on which batch it landed in.
3. **Brand shelves that keep their live membership**, from `src/data/brand-pins.json`
   — see below, and the header of `scripts/pin-brands.mjs`.
4. **Refusing to write** when any result file has fewer rows than its input — agents
   write incrementally, so a half-written file is otherwise indistinguishable from a
   finished one.

## What the review decided

- **Ersa Med and Labella keep the membership the live site has.** The audit read
  brands off the package, which is right for a shampoo bottle and blind for an
  orthopedic range photographed on an anonymous limb: Ersa would have fallen from
  238 products to 158, and Labella — whose wordmark appears on none of the 2049
  packshots — to zero. Both are pinned instead, so Ersa lands at 241 (the 238 plus
  three the article code found elsewhere) and Labella stays at 61. A pin only adds a
  link; where the camera read a different mark, that mark still wins, which is how
  the ESCAPE LX wheelchair stays Comfort *and* sits on the Ersa shelf.
- **The vocabulary gaps are closed** — 50 of the 58 products parked on a bare root
  moved. `pelena-per-bebe` is the one new leaf (22 nappies); everything else went
  into catch-alls that already existed. See the table in PRECEDENTS.md.
- **Still parked, deliberately:** six scalp-route medicines on `barnat` (reachable
  through `alsoTypes: ["kujdesi-i-flokeve"]`) and the two pharmacy carrier bags.
- **The 4 products where the code and the photo disagree** — ids 5089, 19066
  (photographed as *med TEXTILE*) and 10799, 5135 (a *SUPPORT LINK* tag, which is
  not Ersa's *supportline*) — are moot now. All four sit in the old Ersa bucket, so
  the pin puts them where the live site already has them.
- **97 products remain `confidence: "low"`**, and these are genuine photo doubts, not
  vocabulary complaints: the package contradicts the name, or the count or dosage
  form is not legible. They need an eye on the packshot, not another rule.
