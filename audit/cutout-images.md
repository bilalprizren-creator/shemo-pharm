# Product cut-outs — 2026-09-10

Target: development (DATABASE_URL_DEVELOPMENT: ep-rapid-cherry-aj1pxq2q-pooler.c-3.us-east-2.aws.neon.tech/neondb)
Mode:   WRITE (database + products.json updated)

| | |
|---|---|
| Photos cut out | 4 |
| — from a segmentation model's cut | 0 |
| — from Jara's original alpha | 0 |
| — from the old catalogue's alpha | 0 |
| — filled from the old catalogue's white photo | 0 |
| — white background flood-filled | 4 |
| Kept their white background (cut-out rejected) | 0 |
| A backdrop still shows | 0 |
| Reframed after a slab came off | 0 |
| Pictures, trimmed and shown full bleed | 0 |
| Came apart under the fill | 0 |
| Skipped | 0 |
| Unchanged (identical to what is served) | 0 |

## Came apart under the fill (0)

The fill went through the product rather than around it: the largest
surviving piece holds less than 50% of the ink, so what is left is
fragments. Usually a white carton face that was connected to the border and
went with it. These keep whatever they had — nothing here has been made
worse — but they are also not reframed, because scaling wreckage up to 86%
only makes it the most prominent thing in the grid.

Fix by hand-cutting, re-shooting, or adding the code to KEEP_FLAT so the
product shows its original photo on plain white instead.

None.

## Kept their white background (0)

The cut-out was computed and thrown away: what survived was too small or too
narrow to be the product, which happens when the product is itself white —
a surgical cap, an orthopaedic pillow, compression stockings. These still
point at their original photo, so nothing is broken; they simply show a
white square on a tinted card. Re-shoot or hand-cut them to fix.

None.

## A backdrop still shows (0)

Cut out, but a flat colour still rings the product: the photo was shot on a
coloured studio backdrop rather than white, and migrate-images.mjs centred
that whole rectangle on white. Usable, but the rectangle is visible on a
tinted card. See audit/cutout-contact-sheet.html.

None.
