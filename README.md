# SHEMO PHARM — Website

Uebfaqja e SHEMO PHARM: depo farmaceutike dhe distributor me shumicë i
produkteve dhe pajisjeve mjekësore në Prizren, Kosovë.

**Next.js 16 (App Router) + TypeScript + Tailwind CSS v4 + Postgres (Neon).**
Live: <https://shemo-pharm.vercel.app>

> `shemopharm.com` **nuk është** kjo faqe. Ai domen i përket dikujt tjetër dhe
> mban një faqe WordPress që nuk ka lidhje me këtë projekt. Vetëm domeni i
> Vercel-it është faqja jonë (`SITE.domain` te `src/lib/site.ts`).

## Zhvillimi

```bash
npm install
npm run dev          # http://localhost:3000
npm run build        # build produksioni
npm run lint         # ESLint
npx tsc --noEmit     # kontroll i tipave
```

Deploy: `git push` në `main` (projekti është i lidhur me GitHub te Vercel).

## Të dhënat

Gjithçka lexohet nga **Postgres (Neon)**, jo nga skedarë JSON. Tabelat:
`categories`, `products`, `product_categories`, `users`, `contact_messages`,
`orders`.

⚠️ `DATABASE_URL` te `.env.local` tregon te **e njëjta bazë** si produksioni.
Nuk ka bazë të veçantë zhvillimi — çdo skript lokal që shkruan në bazë ndryshon
faqen live menjëherë.

`src/data/*.json` **nuk lexohen në runtime** (përjashtim: `offers.json`). Janë
hyrje dhe kopje sigurie për skriptet.

### Katalogu dhe cache-i

`src/lib/catalog.ts` e ngarkon katalogun e plotë (2 049 produkte) dhe e mban në
dy nivele cache-i:

- `unstable_cache` me tag `catalog` — ruan rezultatin **mes kërkesave**, që një
  hapje faqeje të mos kushtojë një kërkesë të plotë në Neon.
- `cache()` i React — bashkon kërkesat brenda një render-i të vetëm.

Çdo ndryshim nga paneli i adminit e pastron tag-un (`revalidateCatalog()` te
`src/lib/admin-actions.ts`), prandaj ndryshimi duket menjëherë. Një skript që
shkruan direkt në bazë **nuk** e pastron — aty pret deri në 5 minuta.

## Llogaritë dhe çmimet (B2B)

Çmimet shfaqen **vetëm** për llogaritë e aprovuara — kontrolli bëhet gjithmonë
në server (`canSeePrices` te `src/lib/auth.ts`). Vizitorët e paidentifikuar dhe
llogaritë në pritje nuk marrin asnjë të dhënë çmimi as në HTML, as në API.

Tri porta të ndara, që nuk duhen ngatërruar:

1. `email_verified_at` — klienti klikoi lidhjen në email. Nuk bllokon asgjë, por
   shfaqet si shenjë te `/admin/kerkesat` përpara aprovimit.
2. `status` (`pending` → `approved`) — aprovimi juaj i biznesit. Vetëm kjo hap
   çmimet me shumicë.
3. `role` (`customer` / `admin`) — qasja në panelin e administrimit.

Sesioni është një JWT në cookie që mban **vetëm email-in**; statusi dhe roli
lexohen nga baza në çdo kërkesë, që një aprovim të veprojë menjëherë.

Cookie-ja: `httpOnly`, `SameSite=Lax`, `Secure` kudo përveç `next dev`,
7 ditë për klientët dhe **1 ditë për adminët** (`src/lib/session-cookie.ts`).

**Çkyçja i ndal sesionet në të gjitha pajisjet**, jo vetëm në shfletuesin ku u
shtyp. Kolona `users.sessions_valid_from` krahasohet me `iat` të tokenit, ndaj një
cookie e kopjuar ndalon së punuari sapo llogaria del ose ndryshon fjalëkalimin —
më parë ajo vazhdonte të vlente deri në shtatë ditë. Ndryshimi i fjalëkalimit e
bën të njëjtën gjë brenda të njëjtës deklaratë SQL.

Llogaritë e klientëve nga faqja e vjetër WordPress nuk mund të migroheshin (pa
qasje në bazën e saj); klientët regjistrohen sërish.

## Paneli i administrimit

`/admin` (jashtë `[lang]` — pa përkthim, vetëm shqip). Çdo Server Action
rikontrollon `requireAdmin()`, sepse veprimet janë të arritshme drejtpërdrejt me
POST dhe kontrolli i layout-it nuk mjafton.

| Faqja | Për çka |
| --- | --- |
| `/admin` | Përmbledhje: porosi të hapura, kërkesa, produkte, mesazhe |
| `/admin/porosite` | Porositë nga shporta (WhatsApp / email) |
| `/admin/kerkesat` | Aprovimi i llogarive B2B |
| `/admin/produktet` | CRUD i produkteve + ngarkim fotosh |
| `/admin/kategorite` | Emri i shfaqur, lloji, prindi, renditja |
| `/admin/mesazhet` | Mesazhet nga formulari i kontaktit |

**Kategoritë nuk fshihen nga paneli me qëllim.** `product_categories` është
`ON DELETE CASCADE` — fshirja e një rreshti kategorie heq në heshtje të gjitha
lidhjet e produkteve me të. Për ta hequr një kategori nga faqja, zhvendosni
produktet; kategoritë me `count = 0` nuk shfaqen askund.

### Fotot e produkteve

2 049 foto WebP 1000×1000 ndodhen në `public/products/` (≈64 MB, në repo).
Foto të reja ngarkohen nga `/admin/produktet/…` te **Vercel Blob** përmes
`src/app/api/admin/upload/route.ts`.

Skedari kalon **nëpër serverin tonë**, nuk shkon drejt te depoja. Kështu duhet,
sepse vetëm ashtu mund të kontrollohen bajtat: tipi i deklaruar, prapashtesa e
emrit dhe **nënshkrimi real i skedarit** duhet të tregojnë të njëjtin format nga
PNG / JPG / WebP (`src/lib/image-sniff.ts`), përmasat lexohen nga koka (16–4096 px),
dhe emri në depo e zgjedh serveri: `products/<32 hex>.<ext>` me prapashtesën e
formatit **të gjetur**, jo të emrit që erdhi. Një SVG i riemërtuar `foto.png`
refuzohet me `422`.

Kufiri është **2 MB** — Vercel e ndal trupin e kërkesës në 4.5 MB dhe ky numër nuk
konfigurohet, ndaj kufiri i mbetet mirë poshtë tij. Fotoja më e madhe në katalog
është 45 KB.

Lista e host-eve të lejuar është një burim i vetëm te `src/lib/images.ts` dhe
ushqen `next.config.ts`, formularin e adminit dhe shtresën e katalogut. Një URL
foto që nuk kalon aty nuk arrin kurrë te `next/image`.

⚠️ Blob-i u bllokua një herë kur një migrim masiv shpenzoi 2 000 shkrime falas
në një xhiro. Ngarkime individuale janë në rregull; importe masive jo.

⚠️ **Depoja është aktualmente e pezulluar** (billing-u joaktiv), ndaj çdo ngarkim
i re përfundon me `503 store_suspended` dhe paneli e thotë hapur se riprovimi nuk
ndihmon. Të 2 049 fotot ekzistuese nuk preken.

## Shporta (kërkesë porosie)

Nuk është checkout: mbledh produkte + sasi në localStorage (`shemo-cart`) dhe e
dërgon porosinë si tekst përmes WhatsApp ose email. Para se të hapet kanali i
jashtëm, porosia regjistrohet në tabelën `orders` (`src/lib/order-actions.ts`),
që të shfaqet te `/admin/porosite` — vetë mesazhi nuk kalon kurrë nga serveri.
Totali shfaqet vetëm për llogaritë e aprovuara.

## Oferta

`/oferta` shfaq produktet me çmim të ulur real (`regular_cents > price_cents`,
vendoset te formulari i produktit) plus një listë të kuruar te
`src/data/offers.json`. **Kur të dyja janë bosh, lidhja fshihet vetvetiu** nga
menyja, footer-i dhe sitemap-i (`offersAvailable()` te `src/lib/offers.ts`) dhe
rikthehet sapo të ketë një ofertë. Asnjë zbritje nuk shpiket.

## Email-et (Resend)

Verifikimi i email-it, njoftimi për regjistrim të ri, email-i i aprovimit,
rikthimi i fjalëkalimit dhe njoftimi për mesazh të ri dërgohen përmes Resend
(`src/lib/mail.ts`). Pa `RESEND_API_KEY` asgjë nuk dërgohet — mesazhi shkruhet
vetëm në log dhe **asnjë veprim nuk dështon**.

## Variablat e mjedisit

| Variabël | Për çka |
| --- | --- |
| `DATABASE_URL` | Neon Postgres (prod dhe lokal — e njëjta bazë) |
| `AUTH_SECRET` | Nënshkrimi i sesionit dhe i lidhjeve me token. **E detyrueshme** |
| `ADMIN_EMAIL`, `ADMIN_PASSWORD` | Vetëm për `npm run seed:db` |
| `BLOB_READ_WRITE_TOKEN` | Ngarkimi i fotove në Vercel Blob |
| `RESEND_API_KEY` | Çelësi nga resend.com → API Keys |
| `MAIL_FROM` | p.sh. `SHEMO PHARM <noreply@…>` — kërkon domain të verifikuar |
| `MAIL_ADMIN_TO` | Ku shkojnë njoftimet (opsionale; përndryshe `ADMIN_EMAIL`) |
| `APP_ORIGIN` | Origjina për lidhjet në email; përndryshe merret nga Vercel |

## Skriptet

Vetëm dy janë të rregullta; të tjerat janë migrime një-herëshe, të ruajtura si
dokumentim i asaj që u bë.

```bash
npm run seed:db          # import idempotent i src/data/*.json → Postgres
npm run export:catalog   # eksport nga WooCommerce API e faqes së vjetër (historik)
```

Migrimet e skemës nga rishikimi i sigurisë (të dyja `IF NOT EXISTS`, të sigurta
për t'u rikthyer; të zbatuara më 2026-08-11):

```bash
npm run migrate:sessions      # users.sessions_valid_from — çkyçje që vlen vërtet
npm run migrate:rate-limits   # tabela rate_limits — kufij që i ndajnë instancat
```

| Skript | Çfarë bëri |
| --- | --- |
| `migrate-images.mjs` | 2 049 foto → WebP 1000×1000, standardizim + manifest |
| `restructure-categories.mjs` | Ndarja markë/lloj produkti (`kind`, `sort`) |
| `apply-taxonomy.mjs` | Zbatoi auditin e `audit/` mbi katalogun |
| `fix-categories.mjs` | 121 produkte pa kategori + rillogaritje e `count` |
| `pin-brands.mjs` | Fiksoi Ersa Med / Labella te `src/data/brand-pins.json` |
| `create-orders-table.mjs`, `add-email-verification.mjs`, `add-password-reset.mjs`, `add-session-revocation.mjs`, `add-rate-limits-table.mjs` | Migrime skeme |
| `snapshot-categories.mjs` | Foto e pemës para migrimit (`.rollback-*.json`) |

`audit/` mban auditin foto-për-foto të katalogut (41 batch-e, 2 049 produkte) —
shih `audit/README.md`. Rregullat dhe precedentët atje janë arsyeja pse disa
kategori nuk përputhen me emrin e tyre.

## Siguria

Rishikimi i plotë, me çka u gjet, çka u rregullua dhe çka mbetet:
`audit/security-review-2026-08-11.md`.

Pikat që preken shpesh gjatë zhvillimit:

- **Kufijtë e shpejtësisë** (`src/lib/rate-limit.ts`) numërojnë në Postgres për
  bucket-at ku kufiri është masë sigurie (`admin-auth`, `auth`, reset, `verify`,
  `contact`, `order`, `admin-upload`); `search` dhe `lista` mbeten në memorie, se
  `/api/kerko` thirret në çdo shkronjë. Aktivizohen vetëm në Vercel — lokalisht
  ndizeni me `RATE_LIMIT_STORE=postgres`. Në gabim të bazës **lëshojnë**, me një
  rresht log, se ndalimi i çdo kyçjeje për një ndërprerje kalimtare të Neon-it
  është më keq.
- **Rrugët API që shkruajnë** kërkojnë `requireAdminApi()`
  (`src/lib/api-guard.ts`), që kontrollon **origjinën para sesionit**. Pasojë:
  `curl -X POST` kundër `/api/admin/upload` tani do `-H "Origin: https://<host>"`.
- **CSP** është ende `Content-Security-Policy-Report-Only` (`src/lib/csp.ts:REPORT_ONLY`).
  Lista e kushteve për ta kaluar në zbatim është në koka të atij skedari; njëri
  prej tyre kërkon një ngarkim të vërtetë fotoje, ndaj pret riaktivizimin e Blob-it.
  Raportet mblidhen te `/api/csp-report` dhe shkojnë vetëm në log.
- **Eventet e sigurisë** shkruhen si një rresht JSON me prefiks `[security]`
  (`src/lib/security-log.ts`) — kyçje, çkyçje, ngarkime, mutacione shkatërruese.
  Filtroni `"event":"admin-login-failed"` për alarme.
- Përpara commit-it: `npm run lint && npm run typecheck && npm test`.

## Dizajni

Ngjyrat origjinale të SHEMO: mor `#834B9B`, bruz `#14B590` — token-et te
`src/app/globals.css`. Sfondi ivory (`--color-surface`), fonte Space Grotesk
(display) dhe Inter, të dyja vetëm me subset-in `latin`.

`framer-motion` për reveal-e të buta gjatë scroll-it (respekton
`prefers-reduced-motion`). Nuk ka hartë te `/kontakti` — një njësi e vetme,
kontakti mbulohet nga telefoni, WhatsApp, email dhe formulari.

**Kujdes:** rregulli `:focus-visible` te `globals.css` është jashtë çdo cascade
layer, prandaj mund çdo utility të Tailwind-it. Një komponent që vizaton fokusin
e vet duhet `outline-none!` (me `!` në fund, sintaksa e v4).

## Çështje që presin konfirmim nga biznesi

- Statistika "3000+ Produkte" — katalogu ka 2 049. E lënë me vetëdije.
- Kuptimi i "200+ Distributor i autorizuar" nga faqja e vjetër.
- URL e YouTube (vetëm Facebook dhe Instagram u verifikuan).
- Numri që pranon WhatsApp (supozuar 049 600 934).
- Katalog PDF nuk ekziston — butoni shfaqet automatikisht kur të vendoset
  `catalogUrl` te `src/lib/site.ts`.
