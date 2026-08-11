# Baza e të dhënave

Neon Postgres 17, projekti `shemo-pharm` (`bold-boat-97200520`), regjioni
`aws-us-east-2`. Shtatë tabela: `categories`, `products`, `product_categories`,
`users`, `contact_messages`, `orders`, `rate_limits`.

## Dy baza, të ndara

Deri tani ishte një e vetme: `DATABASE_URL` te `.env.local` tregonte te
produksioni, ndaj `node scripts/çfarëdo` shkruante në faqen e gjallë dhe e
vetmja mbrojtje ishte kujdesi i atij që shtypte.

Tani:

| Degë Neon | Për çka | Ku |
| --- | --- | --- |
| `production` (dega e parazgjedhur) | Faqja e gjallë | `DATABASE_URL` te Vercel |
| `development` | Zhvillimi lokal | `DATABASE_URL` + `DATABASE_URL_DEVELOPMENT` te `.env.local` |

**Çdo gjë që ekzekutohet lokalisht shkon te `development`** — `next dev`,
`next build`, `next start` dhe të gjitha skriptet. Produksioni arrihet vetëm në dy
mënyra: duke deploy-uar, ose duke i thënë një skripti `DATABASE_TARGET=production`
me qëllim. Skripti e shkruan hapur në rresht se ku po shkruan:

```
!! PRODUCTION database — ep-nameless-surf-…/neondb (DATABASE_URL_PRODUCTION)
-- development database — ep-rapid-cherry-…/neondb (DATABASE_URL_DEVELOPMENT)
```

### Variablat

Te `.env.local` (nuk hyn në git):

| Variabla | Çka mban |
| --- | --- |
| `DATABASE_URL` | Dega `development`. Kjo është ajo që lexon aplikacioni lokalisht. |
| `DATABASE_URL_DEVELOPMENT` | E njëjta — ajo që lexojnë skriptet si parazgjedhje. |
| `DATABASE_URL_PRODUCTION` | Produksioni. Lexohet **vetëm** me `DATABASE_TARGET=production`. |

Te Vercel: vetëm `DATABASE_URL`, me lidhjen e produksionit. Vercel nuk lexon
`.env.local`, ndaj kjo ndarje nuk e prek deploy-in.

Për mbivendosje personale, `.env.development.local` lexohet përpara `.env.local`
(e njëjta radhë që përdor Next.js për `next dev`).

### Të dhënat personale te `development`

Dega `development` lindi si kopje e produksionit, ndaj filloi me klientët e vërtetë
brenda. Ato u fshinë:

```bash
node scripts/scrub-dev-db.mjs
```

Katalogu mbetet (produkte, kategori, lidhje — informacion publik dhe pikërisht ajo
që duhet për zhvillim); klientët, mesazhet dhe porositë ikin, dhe në vend të tyre
mbetet një admin zhvillimi. Arsyeja nuk është rregullsia: `RESEND_API_KEY` është i
njëjti për të dyja, ndaj një provë e rikthimit të fjalëkalimit kundër një baze
"të sigurt" zhvillimi do t'i dërgonte email një klienti të vërtetë.

Skripti refuzon të punojë nëse `DATABASE_TARGET` nuk është `development`, dhe
rikontrollon që host-i nuk është i njëjti me `DATABASE_URL_PRODUCTION`.

## Skema

`db/schema.sql` është **skedar i gjeneruar** — struktura e plotë, pa rreshta.
Deri tani skema e gjashtë tabelave nuk ishte e shkruar askund: ato u krijuan jashtë
repo-s dhe i vetmi DDL që ekzistonte ishin disa `ALTER TABLE` nga migrimet e
mëvonshme. Një bazë që nuk mund ta rikrijosh është një bazë që nuk mund ta
rikthesh, sado të mira të jenë backup-et — do rikthehesh në një formë që nuk e ka
shkruar kush.

```bash
node scripts/dump-schema.mjs        # rigjeneron db/schema.sql nga zhvillimi
DATABASE_TARGET=production node scripts/dump-schema.mjs
node scripts/apply-schema.mjs       # e zbaton (IF NOT EXISTS — nuk prek rreshta)
```

**Rigjenerojeni pas çdo migrimi dhe commit-ojeni diff-in.**

### Provimi që vërtet funksionon

Një skedar skeme që nuk është replay-uar kurrë është hamendje. `verify-schema.mjs`
e fshin një bazë *të përkohshme* në tokë të zhveshur, replay-on `db/schema.sql`, dhe
krahason formën kolonë për kolonë, kufizim për kufizim, indeks për indeks me bazën
e referencës:

```bash
DATABASE_URL_VERIFY=<degë e përkohshme> node scripts/verify-schema.mjs
```

Rezultati më 2026-08-11: **93 objekte, identike**. Ky provim kapi një defekt real —
versioni i parë i `schema.sql` nuk kishte `CREATE SEQUENCE`, ndaj dështonte në
`CREATE TABLE`-in e parë kundër një baze bosh, pikërisht rasti për të cilin
ekziston skedari.

Skripti refuzon të fshijë çdo host që përputhet me `DATABASE_URL_PRODUCTION`,
`DATABASE_URL_DEVELOPMENT` ose `DATABASE_URL`, dhe e lexon target-in vetëm nga
`DATABASE_URL_VERIFY` — nuk ka konfigurim në të cilin "harrova ta caktoj" të
nënkuptojë "përdor bazën që më intereson".

## Rikthimi nga zeroja

1. Krijoni degë/projekt Neon të re dhe caktoni `DATABASE_URL_*`.
2. `node scripts/apply-schema.mjs` — struktura.
3. Të dhënat:
   - katalogu: `npm run seed:db` (nga `src/data/*.json`, në repo);
   - klientët, porositë, mesazhet: **vetëm nga backup-i i Neon-it.** Ato nuk
     ndodhen në repo dhe nuk duhet të ndodhen.
4. Për sekuencat pas një importi me id-ra të dhëna:
   `SELECT setval('users_id_seq', (SELECT coalesce(max(id), 0) + 1 FROM users), false);`
   (e njëjta për `orders_id_seq`, `contact_messages_id_seq`). `products` dhe
   `categories` nuk kanë sekuencë — id-ra caktohen me dorë, se tabela u mbjell nga
   WooCommerce me id-rat e tij.

⚠️ **Neon PITR është mbrojtja e vetme për të dhënat e klientëve.** Ruajtja e
historisë për këtë projekt është **21 600 sekonda — 6 orë.** Kjo është dritarja
brenda së cilës mund të kthehesh pas. Nëse gjashtë orë nuk mjaftojnë, kjo është një
vendim biznesi për t'u marrë përpara se të duhet, jo pasi.

## Migrimet

`db/schema.sql` është gjendja aktuale. Migrimet inkrementale mbeten skripte, si
dokumentim i asaj që ndodhi dhe pse:

| Skript | Çfarë shtoi |
| --- | --- |
| `create-orders-table.mjs` | tabelën `orders` |
| `add-email-verification.mjs` | `email_verified_at`, `verification_sent_at`, `lang` |
| `add-password-reset.mjs` | `reset_sent_at` |
| `add-session-revocation.mjs` | `sessions_valid_from` |
| `add-rate-limits-table.mjs` | tabelën `rate_limits` |
| `restructure-categories.mjs` | `kind`, `sort` te `categories` |
| `migrate-images.mjs` | `blur_data_url` te `products` |

Të gjitha janë `IF NOT EXISTS` dhe të sigurta për rikthim. Rendi i zbatimit nuk ka
më rëndësi për një bazë të re: `apply-schema.mjs` e ndërton formën përfundimtare
drejtpërdrejt.
