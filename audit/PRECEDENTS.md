# Precedents — decisions already made on earlier batches

RULES.md is the law; this file is case law. Where a product matches one of these,
classify it the same way, so the same thing does not end up in two places.

## The product name lies more often than you expect

Judge the package, never the name. Real examples already caught:

- 9 products named **"Gaza sterile NO:5xx"** are photographed as CANSIN Plast
  *Yara Pedi / Surgical Wound Dressing* boxes → `fllastera`, not `gaza`.
  Only a pack that actually says *Gauze / Sargı / Kompres* is `gaza`.
- **"Katena 100mg"** is tyrosine (supplement, `kapsula`); **"Katena 300mg"** is
  габапентин / gabapentin (`tableta-dhe-kapsula` under barnat). Same name, two
  different products — the mg strength and the manufacturer settle it.
- **"Gell family para pickimit"** is an SOS mosquito repellent gel →
  `mbrojtje-nga-insektet`.
- **"Palloma" in the name means nothing**, exactly like "Labella". Nine products named
  *Palloma …* photograph as Nivea Baby or Pampers wipes; "Palloma" appears on none of
  them. Classify from the photo, brand `null` (both are always-null brands).
- Pen needles and lancets named *INSUPEN / ACCU-CHECK / CONTOUR* carry
  *damlaFine / FORAFINE / ArmoLine / BRP* on the actual box → `brand: null`.
- A product named "… SHEMO" with no SHEMO mark visible on the pack → `brand: null`.

## Wound care — which leaf

- Pack says **Gauze Bandage / Sargı / Kompres** → `gaza`.
- Pack says **Elastic Bandage, Cohesive Elastic Bandage, Ideal Bandage**, or it is
  an elastic limb bandage sold by length (3m x 8cm) → `pelhure`.
- **Yara Pedi / Surgical Wound Dressing** — sterile transparent self-adhesive
  island dressings → `fllastera`.
- **Hydrocolloid blister plaster** → `fllastera` (it dresses broken skin).
- **Corn / callus plasters** → `kujdesi-i-duarve-dhe-kembeve` (foot care). The same leaf
  takes the ointment, jar and collodion-solution versions of the same treatment — these
  are foot care in every format, not `krema-dhe-pomada`.
- **Eyeglass and lens cleaning wipes AND cloths** → `kujdesi-i-syve`, including plain
  microfibre cloths. They clean the lens, not the eye, but nothing else comes closer.
- **Eye pads / Göz Pedi** → `kujdesi-i-syve`, not `fllastera`.
- **Acne patch** → `kujdesi-i-fytyres`.
- **Perforated heat plaster / menstrual heating pad** → `ndihma-e-pare`.
- **Nasal strips** → `kujdesi-i-hundes`.

## Known vocabulary gaps — use the stated fallback and mark `low`

These have no leaf. Do not invent one; use the fallback below, `confidence: "low"`,
and say in `note` what leaf is missing.

| Product kind | Use | |
|---|---|---|
| Oral **liquid** "medical device" in sticks/vials (Esoxx One) | `shurupa-suplemente` | |
| Oral **capsule** "medical device" (Gelsectan) | `kapsula` | |
| Cushions, seat/cervical/coccyx pillows, positioning wedges | `te-tjera-ersa-med-ortoped` | |
| Stool / sample containers | `kateter-dhe-qese-urinare` | |
| Cane tips, walking-stick accessories | `karrige-dhe-ndihmese-per-ecje` | |
| Oxygen tubing, nasal cannula, humidifier bottles, oxygen masks | `inhalatore-dhe-aspiratore` | |
| Medicinal powder sachet for oral solution (Lupocet-type cold remedy) | `shurupa` | |
| Shoulder immobilizer / Velpeau arm sling | `krah` | |
| "Sexual massage oil" sold beside lubricants | `prezervativ` | |
| Artificial sweetener tablets (Huxol) | `suplemente` (root) | |
| **Baby nappies** (Pampers Active Baby / Premium Care / Maxi Pack) | `per-femije` (root) | 22 products, no leaf exists |
| Eyeglass and lens cleaning wipes | `kujdesi-i-syve` | |
| Anti-snore nose clip | `kujdesi-i-hundes` | |
| **Silicone breast prosthesis / mastectomy form** | `te-tjera-ersa-med-ortoped` | 4 products, no leaf |
| Burn-relief cream or lotion with no named drug | `ndihma-e-pare` | |
| Supplement in a spray bottle | `shurupa-suplemente` | |
| Foot-odour powder — odour control, not care | `deodorante` | |
| Waterproof mattress protector sheet | `alkool-dhe-antiseptik` (root) | |
| Printed pharmacy carrier bags — retail supplies, not a product | `paisje-medicinale` (root) | candidate for `hidden` |

Note the adult/baby split: **"Pampers për të rritur"** is adult incontinence and belongs in
`pelena-per-te-rritur`; a Pampers *baby* nappy does not, despite the identical brand name.
| Medicated shampoo or scalp-route drug — permethrin, ketoconazole, minoxidil spray | `barnat` (root) + `alsoTypes: ["kujdesi-i-flokeve"]` | |
| Lice product that states it contains NO insecticide ("böcek ilacı içermez") | `kujdesi-i-flokeve` — not a drug, so not barnat | |
| Honey and folk-remedy jars (incl. honey with goose fat) | `suplemente` (root) | |
| Infant hip-abduction / dysplasia harness | `te-tjera-ersa-med-ortoped` | |
| Multipurpose isotonic saline claiming nose+eye+ear use | `kujdesi-i-hundes` + `alsoTypes: ["kujdesi-i-syve","kujdesi-i-vesheve"]` | |
| Cold-sore / herpes lip patch | `fllastera` | |
| Vapor patch stuck to clothing | `kujdesi-i-hundes` | |
| Decorative makeup (mascara, brow and lash products) | `te-tjera` | |
| Kinesiology / athletic tape | `leukoplasta` | |
| Medicated mouthwash / gargle with a named active | `dentare` | |
| Venous tourniquet, phlebotomy arm strap | `shiringa-dhe-gjilpera` | |

**After-bite and anti-itch bite lotions** go to `mbrojtje-nga-insektet` together with the
repellents, `confidence: "high"` — same product family, and there is no separate leaf.

## Other settled calls

- **Jake "VitaminCandy"** (candy enriched with vitamins) → `bonbona`. A plain Jake
  mints tin with no vitamin claim → `embelsira`. Jake is never a brand slug.
- **Alpenlor** lozenges and lollipops → brand `dr-frei`.
- Children's **vitamin** → the supplement form leaf as `type`, plus
  `alsoTypes: ["per-femije"]`. Baby skincare and feeding go to the `per-femije`
  leaves directly.
- **Compression tights / "Hollaopke"** with CCL1 / CCL2 / DEN → `corape-kompresioni`.
  Generic leg photos with no visible label → `brand: null`.
- **Heparin creams and suppositories** (Hepathrombin, Heplapan) → `krema-dhe-pomada`
  / `supositore` under barnat, brand `null` (Hemofarm and Galenika are not brands here).
- **Personal nasal inhaler sticks** with no drug substance listed →
  `inhalatore-dhe-aspiratore`.
- **"Anti-allergy" on an eye drop is a marketing claim, not a drug.** Read the
  ingredients: a named antihistamine → `pika` under barnat; sodium hyaluronate,
  echinacea, or a lens-compatible comfort formula → `kujdesi-i-syve`.
- **Vaginal capsules / ovules** with no named drug substance → `supositore`.

## Brand discipline

**Never infer a brand from an article code or from the product name.** Only assign a
brand you can actually SEE on the package. Article codes are applied afterwards by a
deterministic rule in `scripts/merge-audit.mjs`, so leaving `null` costs nothing and
guessing costs accuracy. In particular, do NOT try to apply these yourself:

- `ERSA…`, `SL-###`, `SLP-###` → handled automatically (Ersa Med).
- `NT-###`, `WZ-###` in the SKU → handled automatically (TIO Medikal).
- `SHM###` or `SHEMO` in the name → handled automatically (Shemo house brand).

Note that RULES.md's claim that Ersa Med uses `S####` codes is **wrong** — measured
against the catalog, none of the 11 `S####` products are Ersa. If you see a bare
`S####` code and no logo, the answer is `null`.

A missing brand is never a reason to set `confidence: "low"` — confidence is about the
product TYPE only.

Only the 25 slugs in RULES.md exist. Two traps already hit:

- **"Firefly"** toothbrushes are NOT the `freely` brand. Different product.
- **"Support Line" IS Ersa Med** — corrected. One retail box carries "supportline" and
  "ersamed®" printed together, and all 16 Support-Line products seen so far sit in the
  old Ersa Med bucket. If either wordmark is legible → `ersa-med-ortopedi`. A bare
  diamond icon with no readable wordmark is still `null`.
- **"Labella" in the product name means nothing.** Across 1050 audited products, not one
  pack actually carried a Labella wordmark. Items named *Labella…* turn out to be
  Curalene, Disney Frozen, Chupa Chups, Neutrogena, L.O.L. Surprise, Spider-Man and
  others; items named *Labellë…* are genuine Nivea **Labello**, which is always `null`.
  Use `labella` only if the pack itself says Labella.
- **"heilusan"** is a spelling variant of Heliusan → `eferveta-kruger-heliusan`.
- **"NT41 Solutions"** is NOT TIO Medikal. RULES.md already names NT41 in its always-null
  list; the resemblance to TIO's "NT article codes" is a coincidence. Always `null`.
- A logo cropped by the photo vignette still counts if what remains is unambiguous —
  "Dr.F…" can only be `dr-frei`, since `dr-luigi` would read "Dr.L…".

If a pack is visually identical to a known-branded sibling but the mark itself is not
legible in *this* photo, leave `brand: null`. A missing brand is recoverable; an
invented one is not.
