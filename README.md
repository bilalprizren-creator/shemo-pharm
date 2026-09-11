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

Gjithçka lexohet nga **Postgres (Neon)**, jo nga skedarë JSON. Shtatë tabela:
`categories`, `products`, `product_categories`, `users`, `contact_messages`,
`orders`, `rate_limits`. Skema e plotë: [`db/schema.sql`](db/schema.sql) —
skedar i gjeneruar, i provuar që rikthen bazën. Detajet: [`db/README.md`](db/README.md).

**Zhvillimi dhe produksioni janë baza të ndara.** Çdo gjë që ekzekutohet
lokalisht — `next dev`, `next build`, `next start`, çdo skript — shkon te dega
`development` e Neon-it. Produksioni arrihet vetëm duke deploy-uar, ose duke i
thënë një skripti me qëllim:

```bash
DATABASE_TARGET=production node scripts/dump-schema.mjs
```

Skriptet e shkruajnë hapur se ku po shkruajnë, në rreshtin e parë. Më parë kjo
ndarje nuk ekzistonte: `.env.local` mbante lidhjen e produksionit dhe çdo skript
lokal ndryshonte faqen live menjëherë.

Dega `development` u pastrua nga të dhënat e klientëve
(`npm run db:scrub-dev`) — katalogu mbetet, klientët e vërtetë jo. Arsyeja është te
`db/README.md`, dhe nuk është rregullsia.

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

### Ndarja e një pamjeje të katalogut

Çdo filtër i listës jeton në URL — kërkimi (`kerko`), renditja (`renditja`),
vetëm-në-stok (`stok`), lloji brenda një marke (`lloji`) dhe faqja (`faqja`).
Prandaj adresa aktuale **është** pamja: kopjimi i saj e hap te tjetri saktësisht
të njëjtën listë. Butoni "Ndaje" (`src/components/catalog/ShareLink.tsx`) e
merr atë adresë te sistemi i ndarjes (WhatsApp, Viber), te clipboard-i ose — kur
shfletuesi i brendshëm i Facebook-ut a Instagram-it e refuzon clipboard-in — te
një fushë gati për kopjim.

`listingMetadata` (te `CatalogView.tsx`) e emërton lidhjen te kartela Open
Graph: pa të, çdo listë e trashëgonte kartelën e përgjithshme të faqes dhe një
link për "Vitaminat", për një markë dhe për një kërkim dukeshin të njëjtë në
WhatsApp.

Dy gjëra **nuk** udhëtojnë me linkun, me qëllim:

- **Çmimet** — shihen sipas llogarisë së atij që e hap (shih më poshtë), jo
  sipas llogarisë së atij që e dërgoi.
- **Lista e dëshirave dhe shporta** — rrinë te `localStorage` i shfletuesit,
  ndaj `/lista-e-deshirave` te marrësi hapet bosh.

### Dy faqe, një deployment

`shemo-katalog.com` është faqe më vete, me domain të vetin, por e shërbyer nga i
njëjti deployment — ndarja bëhet vetëm sipas hostname-it (`src/proxy.ts` →
`src/lib/site-mode.ts`). Gjithçka që i takon vetëm asaj faqeje rri te
`src/katalog/`, bashkë me një README që shpjeton rrugët, shtypjen dhe kurthet:
**[src/katalog/README.md](src/katalog/README.md)**.

Kujdes: domain-i ende s'është zhvendosur — `shemo-katalog.com` tregon te
Hostinger, pra te faqja e vjetër.

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
| `/admin/katalogu` | Seksionet e katalogut të shtypur dhe rendi brenda tyre |
| `/admin/mesazhet` | Mesazhet nga formulari i kontaktit |

**Katalogu i shtypur redaktohet te `/admin/katalogu`**, jo te kategoritë:
janë dy taksonomi të ndryshme (`catalog_sections` kundrejt `categories`) dhe
vetëm 14 nga 63 seksionet e shtypura përputhen me ndonjë kategori. Aty krijohen
e riemërtohen seksionet, lëviz produkti lart e poshtë brenda seksionit, dhe
shihet se cilat seksione nuk shfaqen fare në `shemo-katalog.com` sepse janë
bosh. Seksionet fshihen vetëm kur janë bosh: çelësi i huaj është
`ON DELETE SET NULL`, prandaj fshirja e një seksioni me produkte do t'i hiqte
të gjithë ata nga katalogu pa asnjë paralajmërim. Te `/admin/produktet` filtrat
**Dyqani**, **Katalogu** dhe **Seksioni** i ndajnë të tri pyetjet: a shitet, a
shtypet, a ka fare vend në katalog — p.sh. `?seksioni=pa-seksion` jep 311
produktet që nuk janë shtypur kurrë. Filtrat **Kategoria** dhe **Seksioni i
shtypur** zgjedhin një grup: kategoria numërohet bashkë me nënkategoritë e saj,
si te `recountCategories`, ndryshe një fshehje masive do të linte pjesën më të
madhe të degës jashtë.

**Sa produkte shfaqen ku.** Te `/admin` dhe te `/admin/produktet` rri një
përmbledhje me katër numra — gjithsej, në dyqan, në katalog, askund — dhe secili
është lidhje drejt asaj pjese të tabelës. Dy kolona të pavarura, ndaj «në
dyqan» dhe «në katalog» nuk mblidhen te «gjithsej»; **«askund»** është ai që
krijohet pa u vënë re, kur një produkt fshihet nga njëra faqe një javë dhe nga
tjetra javën tjetër. Vetë tabela e produkteve është vendi ku shfaqen *të gjitha*
produktet, të fshehurat përfshirë — asnjë faqe publike nuk i tregon.

**Ndryshimet masive.** Kutitë te rreshtat plus shiriti poshtë tabelës —
te `/admin/produktet` dhe te `/admin/katalogu/<id>` — vendosin dukshmërinë e një
grupi për njërën faqe pa e prekur tjetrën, ose e zhvendosin grupin në një
seksion të shtypur (produktet shkojnë në fund të tij, sepse rendi i shtypur
është vendim njeriu). Vlera vendoset absolute, jo si ndërrim: mbi një zgjedhje
të përzier, një ndërrim përfundon gjysmë e shfaqur e gjysmë e fshehur. Kutia
**«Zgjidh të gjitha N që përputhen»** nënkupton filtrin, jo faqen e dukshme —
me filtrat bosh ajo është i gjithë asortimenti, prandaj mbi 25 produkte kërkohet
një konfirmim. Fjalori i filtrave rri te
[`src/lib/product-filter.ts`](src/lib/product-filter.ts), i njëjti për URL-në
dhe për POST-in e shiritit, që të mos ndryshojë kurrë grupi ndërmjet asaj që
tabela numëron dhe asaj që butoni shkruan.

**Dukshmëria është e ndarë për dy faqet.** `products.hidden` fsheh nga dyqani,
`products.catalog_hidden` nga katalogu i shtypur, dhe asnjëri nuk rrjedh nga
tjetri: një artikull i ndërprerë mund të mbetet në katalogun që partneri e ka në
letër, dhe një listim i dyqanit mund të mos ketë vend në shtyp. Te tabela e
produkteve secila ka kolonën e vet (sy / libër), te formulari secila ka kutinë e
vet, dhe te `/admin/katalogu/<id>` kolona **Shtypet** e ndryshon vetëm atë të
katalogut. Migrimi që e shtoi kolonën
(`npm run migrate:catalog-visibility`) i nisi të dyja njësoj, ndaj asgjë nuk
ndryshoi në momentin e kalimit.

**Kategoritë nuk fshihen nga paneli me qëllim.** `product_categories` është
`ON DELETE CASCADE` — fshirja e një rreshti kategorie heq në heshtje të gjitha
lidhjet e produkteve me të. Për ta hequr një kategori nga faqja, zhvendosni
produktet; kategoritë me `count = 0` nuk shfaqen askund.

### Fotot e produkteve

2 049 foto WebP 1000×1000 ndodhen në `public/products/` (≈64 MB, në repo).

**Optimizuesi i Next-it është i fikur** (`images.unoptimized` te
`next.config.ts`). Vercel numëron një transformim për çdo foto × gjerësi ×
format, plani Hobby lejon 5 000, dhe një katalog me 2 049 produkte nuk hyn nën
atë tavan: numëratori kaloi, `/_next/image` filloi të kthejë **402
`OPTIMIZED_IMAGE_REQUEST_PAYMENT_REQUIRED`**, dhe dyqani i humbi fotot një nga
një sapo skadonin variantet e ruajtura. Skedarët vetë ishin gjithnjë në rregull.

Prandaj zvogëlimi bëhet një herë, jo për çdo kërkesë:

```bash
npm run images:thumbs          # vetëm ato që mungojnë
npm run images:thumbs -- --force
```

`scripts/thumbnail-images.mjs` shkruan një kopje 560 px të secilës foto te
`public/products/thumb/`. 560 sepse një kartelë vizatohet më së shumti 280 px
(shih `sizes` te `ProductCard`) dhe një ekran 2× do dyfishin; faqja e produktit
vizaton 432 dhe vazhdon me foton e plotë, si edhe fletët e shtypit.
`thumbnailFor()` te `src/lib/images.ts` e ndërton shtegun me aritmetikë, pa
listë që vjetrohet — çka funksionon vetëm nëse **çdo** foto ka kopjen e vet,
dhe [`tests/thumbnails.test.ts`](tests/thumbnails.test.ts) bie nëse jo. Një foto
e shtuar pa e rrotulluar skriptin do të dukej si figurë e thyer në çdo listë, në
të dyja faqet, pa asnjë gjurmë në log.

**Nga vijnë sfondet e pastra.** Fotot origjinale erdhën nga WordPress-i i vjetër,
të rrafshuara mbi të bardhë, dhe `scripts/cutout-images.mjs` u heq atë sfond. Ka
katër burime, sipas besueshmërisë:

1. `sources/segmented/<kodi>.png` — foto të skenuara (një shishe në plazh, një
   tubë mbi motiv) të prera me model segmentimi nga `scripts/segment-scenes.mjs`.
   Modeli (332 MB) nuk është varësi e aplikacionit dhe nuk guxon të bëhet: brenda
   `node_modules` të këtij projekti ai përplaset me `sharp` dhe procesi vdes.
   Instalohet në dosje të vetën, jashtë repos, dhe arrihet me `SEGMENT_MODEL_DIR`.
   Prerjet dhe kornizat e rishikuara rrinë te `sources/segmented/recipe.json`.
   Korniza thotë ku të shihet, kurrë ku mbaron produkti: një prerje që prek buzën
   e kornizës së vet u pre nga korniza dhe jo nga modeli, dhe skripti ndalon me
   gabim. Çdo ekzekutim lë `sources/segmented/proof.png` — çdo kornizë e vizatuar
   mbi origjinalin e vet, përkrah asaj që u kthye.
2. Alfa origjinale e projektit Jara.
3. Prerjet e vetë faqes së vjetër shemo-katalog.com, të shkarkuara me
   `scripts/fetch-katalog-images.mjs` te `sources/shemo-katalog/` (≈360 MB).
4. Mbushja nga kufiri i bardhë (flood fill).

`sources/` nuk hyn në git — shkarkohet përsëri për disa minuta. Bën përjashtim
`sources/segmented/recipe.json`, që **është** në repo: 2 KB vendimesh të lexuara
me sy, pa kopje tjetër askund dhe pa asgjë prej së cilës të rindërtohet. Prerjet
e bëra prej tyre nën `public/products/` janë gjithashtu në repo.

⚠️ Shtegu i fotos rri në bazë, jo në kod: një prerje e re nuk duket në prodhim
derisa të bëhet `DATABASE_TARGET=production node scripts/sync-image-paths.mjs --write`.
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

Skema — shih [`db/README.md`](db/README.md) për rikthimin nga zeroja:

```bash
npm run db:schema:dump    # rigjeneron db/schema.sql (pas çdo migrimi!)
npm run db:schema:apply   # e zbaton (IF NOT EXISTS — nuk prek rreshta)
npm run db:schema:verify   # provon se vërtet rikthen bazën, në një degë të përkohshme
npm run db:scrub-dev      # heq të dhënat e klientëve nga baza e zhvillimit
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
| `cutout-images.mjs` | Heq sfondin: 4 burime, raport te `audit/cutout-images.md` |
| `fetch-katalog-images.mjs` | Shkarkon prerjet e shemo-katalog.com te `sources/` |
| `segment-scenes.mjs` | Pret produktin nga një foto e skenuar (model segmentimi) |
| `sync-image-paths.mjs` | Çon shtigjet e `products.json` në bazën e zgjedhur |
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
- 176 artikuj që janë në katalogun e shtypur nuk gjendeshin në bazë kur u
  shkrua `audit/catalog-order-import.md` — lista atje. 7.3 Ivy Bear u shtua
  ndërkohë me `scripts/add-ivy-bear.mjs`, por pa çmime: 10 produktet janë të
  fshehura në të dy faqet derisa të vendosen çmimet te `/admin/produktet`.
  Dy seksione mbeten bosh për këtë arsye (38 Denk Pharma, 7.3 Ivy Bear),
  prandaj faqja tregon 61 seksione e jo 63.
