# Category audit — closed vocabulary and rules

You are classifying products for a Kosovar pharmacy wholesaler (SHEMO Pharm).
Labels are Albanian. For every product you get its **name**, its **id**, and a
**photo of the actual package**. The photo is the evidence; the name is a hint.

## Output

One JSON object per product, all of them in a single JSON array, written to the
output file you were given. Nothing else in the file.

```json
{"id": 6550, "type": "kujdesi-i-fytyres", "alsoTypes": [], "brand": "froika",
 "confidence": "high", "note": "FROIKA AC AHA-10 dermatological emulsion"}
```

- `id` — copy it exactly from the batch file.
- `type` — **exactly one** slug from the type list below. What the product *is*.
- `alsoTypes` — 0 to 2 further type slugs where a customer would also look.
  Use sparingly; `[]` is the normal answer.
- `brand` — exactly one slug from the brand list, or `null`.
- `confidence` — `"high"` normally, `"low"` if the photo does not settle it.
- `note` — max ~12 words: what you actually read off the package.

## Hard rules

1. **Never invent a brand.** Only the 25 slugs below exist. The catalog is full
   of Nivea, Johnson's, Vaseline, Rexona, Veet, Listerine, Bepanthen and dozens
   of pharma manufacturers — all of those get `"brand": null`. A brand is only
   correct if you can *see* that brand mark on the package.
2. `type` must be a slug from the list. If genuinely nothing fits, use the
   nearest **root** slug and set `confidence: "low"` with a note saying what
   leaf is missing.
3. If the photo is unreadable, a plain carton, or contradicts the name, say so
   in `note` and set `confidence: "low"`. Do not guess silently.
4. Judge the product, not the old shelf it sat on. You are not being shown the
   current category on purpose.

## Type list

Indented entries are children. Assign the **deepest** fitting entry.

```
barnat ......................... medicines with a pharmaceutical active ingredient
  tableta-dhe-kapsula .......... tablets, capsules, film-coated tabs
  shurupa ...................... medicinal syrups
  pika ......................... medicinal drops of any route — eye, ear, nose or oral
  sprej-dhe-inhalim ............ nasal & oral sprays, inhalers, nebuliser solutions
  krema-dhe-pomada ............. medicated creams, ointments, gels (Beloderm, Daktanol)
  ampula-dhe-tretesira ......... ampoules, injections, infusions, IV solutions
  supositore ................... suppositories, vaginal ovules

suplemente ..................... food supplements, vitamins, minerals
  kapsula ...................... supplement capsules and tablets
  eferveta ..................... effervescent tubes (A20 EFF etc.)
  bonbona ...................... vitamin gummies, lozenges, lollipops, candy vitamins
  omega-3 ...................... fish-oil / omega products
  pluhur-dhe-qese .............. powders and sachets
  shurupa-suplemente ........... liquid supplements, supplement drops, vials
  soda-bikarboni ............... baking soda
  te-ndryshme-suplements-effervescent ... supplement that fits none of the above

kozmetike ...................... cosmetics and personal care
  higjienike ................... soap, shower gel, intimate wash, wet wipes
  kujdesi-i-fytyres ............ face serums, face creams, cleansers, masks
  kujdesi-i-trupit ............. body lotions, body creams, hand-and-body milk, vaseline jars
  kujdesi-i-flokeve ............ shampoo, conditioner, hair oil, hair masks, dyes
  dentare ...................... toothpaste, toothbrush, mouthwash, floss, denture care
  kujdesi-i-buzeve ............. lip balm, lip care sticks (Labello, Labella, Lip Therapy)
  mbrojtje-nga-dielli .......... anything whose main claim is SPF sun protection
  deodorante ................... deodorant, antiperspirant
  kujdesi-i-duarve-dhe-kembeve . hand creams, foot creams, heel care, pumice
  kujdesi-i-thonjve ............ nail polish remover, nail treatment, nail files
  parfume ...................... perfume, eau de toilette
  rroje-dhe-depilim ............ razors, wax strips, depilatory cream
  aksesore-kozmetike ........... brushes, tweezers, cotton pads, gua sha, mirrors
  te-tjera ..................... cosmetic that fits none of the above

ortopedi ....................... orthopedic supports and aids
  kembe ........................ leg / foot supports, generic
    gjuri ...................... knee braces and supports
    corape ..................... orthopedic socks (non-compression)
    nyje ....................... ankle supports
    gisht-kembe ................ toe separators, bunion aids
    corape-kompresioni ......... compression stockings (CCL1 / CCL2, varicose veins)
    shtroje .................... insoles
  dore ......................... hand / arm supports, generic
    krah ....................... elbow and upper-arm supports
    gisht ...................... finger splints
  shoka-dhe-korseta ............ back braces, corsets, abdominal belts
  qafore ....................... cervical collars
  karrige-dhe-ndihmese-per-ecje  crutches, walkers, wheelchairs, commodes
  mbathje-ortopedike ........... orthopedic footwear
  te-tjera-ersa-med-ortoped .... orthopedic item fitting none of the above

paisje-medicinale .............. medical devices and consumables
  aparatura .................... measuring / powered devices, generic
    tensiometra ................ blood-pressure monitors and cuffs
    termometra ................. thermometers
    inhalatore-dhe-aspiratore .. nebulisers, inhalation devices, nasal aspirators
    oksimetra .................. pulse oximeters and patient monitors
    diabetike .................. glucometers, lancets, test strips
    te-ndryshme ................ device fitting none of the above
  doreza-dhe-maska ............. gloves, surgical masks, caps, gowns
  shiringa-dhe-gjilpera ........ syringes, needles, cannulas, infusion sets
  kateter-dhe-qese-urinare ..... catheters, urine bags, bedpans, urinals
  teste-diagnostike ............ pregnancy, ovulation and rapid tests
  kujdesi-i-syve ............... eye drops (non-medicinal), contact-lens solutions, eye patches
  kujdesi-i-vesheve ............ ear plugs, ear drops, ear cleaning
  kujdesi-i-hundes ............. nasal irrigation kits, saline sea-water sprays, nasal strips
  ndihma-e-pare ................ first-aid kits, hot/cold gel packs, hot-water bottles, wooden spatulas, ultrasound gel
  aksesore-per-barna ........... pill boxes, pill cutters and crushers, denture boxes

alkool-dhe-antiseptik .......... hygiene and antiseptics
  dezinfektues ................. alcohol, iodine, hand and surface disinfectant
  tampon ....................... tampons, pads, panty liners, intimate hygiene
  pelena-per-te-rritur ......... adult incontinence pants and pads
  antibakterial ................ antibacterial washes and sprays
  mbrojtje-nga-insektet ........ mosquito and insect repellent — sprays, lotions, wristbands, coils (Autan)

fasha .......................... wound care
  fllastera .................... adhesive plasters
  gaza ......................... sterile gauze, compresses
  leukoplasta .................. surgical tape
  pelhure ...................... fabric / textile dressings

vajra .......................... natural oils and teas
  vajera ....................... natural and essential oils
  cajra-mjekesore .............. medicinal teas, loose
  cajra-me-filter .............. tea bags

prezervativ .................... condoms, lubricants

per-femije ..................... products specifically for babies and children
  ushqyerja-e-bebeve ........... bottles, teats, pacifiers, breast pumps, milk storage
  kujdesi-i-bebeve ............. baby cream, baby oil, baby powder, baby wipes, baby soap

embelsira ...................... ordinary sweets and chewing gum with no health claim
```

### Type judgement calls

- **Medicine or supplement?** A strength in mg of a named drug substance
  (Ibuprofen 400mg, Diazepam 10mg, Amoxicillin 500mg) → `barnat`. "Food
  supplement", "suplement ushqimor", vitamin/mineral naming, an A20/A30/A60
  count → `suplemente`.
- **Medicated cream or cosmetic cream?** A corticosteroid, antifungal or
  antibiotic name on the tube → `krema-dhe-pomada` under Barnat. A moisturiser,
  anti-age or anti-acne cosmetic → the matching `kozmetike` leaf.
- **SPF**: a day cream that mentions SPF in passing stays a face cream. A
  sunscreen whose whole purpose is protection → `mbrojtje-nga-dielli`.
- **Children.** Baby skincare and feeding → the `per-femije` leaves. A
  children's *vitamin* → the supplement form leaf as `type`, and
  `"alsoTypes": ["per-femije"]`.
- **Vaseline / lip products.** A lip stick or lip tin → `kujdesi-i-buzeve`.
  A vaseline jar or tube for the body → `kujdesi-i-trupit`.
- **Eye and ear drops.** Medicinal (antibiotic, anti-allergy) → `pika` under
  Barnat. Moisturising, saline or lens-related → `kujdesi-i-syve`.

## Brand list

Use a slug **only** if you can see that brand on the package.

```
ersa-med-ortopedi ... Ersa Med (orthopedic supports, often with S#### article codes)
cansin .............. Cansin / Cansin Plast (Turkish wound care, "since 1984")
swiss-energy ........ Swiss Energy (Swiss supplement line, effervescent tubes and capsules)
froika .............. FROIKA / FROÏKA (Greek dermocosmetics: AC, Hyaluronic, Froiplak, W Plus)
labella ............. Labella / Labellë lip balms (NOT Labello, which is Nivea)
atc-natyral ......... ATC Natyral (natural oils and teas)
krauterhof .......... Kräuterhof (German herbal creams, balms, gels)
mr-white ............ Mr. White (children's oral care, Disney/Barbie toothbrushes)
senti2 .............. Senti 2 / SENTI2
bio-tree-baby ....... Bio Tree Baby
bioblas ............. Bioblas (Turkish hair care)
chicco .............. Chicco
dr-frei ............. Dr. Frei (also the Alpenlor lozenge and lollipop line)
shemo ............... Shemo (the house brand — SHM device codes, "SHEMO" on the box)
comfort ............. Comfort / Dr. Comfort
eferveta-kruger-heliusan ... Kruger or Heliusan effervescents
haribo .............. Haribo
tio-medical ......... TIO Medikal (NT / WZ article codes)
dolphi .............. Dolphi
dr-luigi ............ Dr. Luigi
restorex ............ Restorex
solgar .............. Solgar
autan ............... Autan
love-plus ........... Love Plus
freely .............. Freely
```

Everything else — Nivea, Labello, Johnson's, Vaseline, Rexona, Veet, Whisper,
Listerine, Bepanthen, Pampers, Orbit, Jake, Galenika, Hemofarm, Ilirija, "48",
NT41, Elina, Curalene, Milkway, Broche, Setino and every pharmaceutical
manufacturer — is `"brand": null`.
