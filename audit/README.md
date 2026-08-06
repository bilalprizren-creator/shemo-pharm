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
| Classified | **1800 of 2049** — batches 001–036 |
| Remaining | batches **037–041** (249 products) |
| Validator | 0 problems |
| Applied to JSON or the database | **nothing yet** |

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
`audit/batches/*.json` point. Nothing else needs restoring.

Then, for each remaining batch, run one subagent with this brief:

> Read `audit/RULES.md` in full, then `audit/PRECEDENTS.md` in full, then
> `audit/batches/batch-0NN.json`. For EVERY product, open the `image` path with the
> Read tool and look at the package — the photo is the evidence, the name is only a
> hint and is often wrong. Write `audit/out/batch-0NN.json`: one object per product,
> same order, `{id, type, alsoTypes, brand, confidence, note}`. `type` is exactly one
> slug from RULES.md, the deepest leaf that fits. `brand` only when the mark is
> legible in the photo — never inferred from an article code or the name, since codes
> are applied afterwards by a deterministic rule. Write the file incrementally every
> ~10 products so an interruption does not lose the batch.

Then gate on:

```bash
node scripts/merge-audit.mjs audit/out
```

It must report `problems: 0` and no `INCOMPLETE` list. Repeat until
`classified: 2049 of 2049`.

## Then

```bash
node scripts/merge-audit.mjs audit/out --write   # -> src/data/catalog-assignments.json
node scripts/apply-taxonomy.mjs                  # dry run, writes nothing
```

Review the dry run before anything else. **`.env.local` points at the same Neon
database as production**, so `--commit` is a live edit — take a fresh snapshot with
`node scripts/snapshot-categories.mjs` first, and deploy the reading code before
migrating the data, not after.

## What `merge-audit.mjs` decides on its own

Three things are derived deterministically rather than left to per-batch judgement,
because an LLM applying the same rule 2049 times will not apply it the same way twice:

1. **Brand from article code**, filling only what the photo audit left `null`. Each
   pattern was measured against the catalog before being trusted — `REF-###` is Ersa
   Med in 41 of 41 cases, `ERS-` in 16 of 16, `SL-`/`SLP-` in 50 of 51. RULES.md's
   claim that Ersa uses `S####` codes is **wrong**: none of those 11 products are Ersa,
   so that pattern is deliberately absent.
2. **`per-femije` for children's brands** whose type sits outside the children's
   branch. A Disney toothbrush is `dentare`, which hangs under Kozmetikë, so without
   this it appears under "Për fëmijë" or not depending on which batch it landed in.
3. **Refusing to write** when any result file has fewer rows than its input — agents
   write incrementally, so a half-written file is otherwise indistinguishable from a
   finished one.

## Open questions for the dry run

- **Vocabulary gaps.** Baby nappies have no leaf at all (22 products, currently parked
  on the `per-femije` root). Also unhoused: topical/scalp-route medicines such as
  medicated shampoos and minoxidil, silicone breast prostheses, oral "medical device"
  products, cushions, hospital beds, and printed pharmacy carrier bags — which are
  retail supplies and probably want `hidden` rather than a category.
- **Labella.** Across 1750 audited products, not one package carries the Labella mark.
  The brand and the two categories merging into it are heading for `count = 0`.
- **Ersa Med** lands at ~160 products via article codes, against 238 in the old bucket.
  The difference is genuine foreign stock — the old bucket held a stool-sample cup, a
  Medura kinesiology tape and an ESCAPE LX wheelchair.
