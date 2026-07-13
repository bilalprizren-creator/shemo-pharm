# SHEMO PHARM — Website

Uebfaqja e re e SHEMO PHARM: depo farmaceutike dhe distributor me shumicë i
produkteve dhe pajisjeve mjekësore në Prizren, Kosovë.

Ndërtuar me **Next.js 16 (App Router) + TypeScript + Tailwind CSS v4**.

## Zhvillimi

```bash
npm install
npm run dev          # http://localhost:3000
npm run build        # build produksioni
npm run lint         # ESLint
npm run export:catalog  # rifreskon katalogun nga faqja e vjetër (shih më poshtë)
```

## Të dhënat e katalogut

Produktet (2 049) dhe kategoritë (90) janë eksportuar nga WooCommerce Store API
e faqes ekzistuese (`shemopharm.com/wp-json/wc/store/v1/…`) në
`src/data/products.json` dhe `src/data/categories.json`.

- Rifreskimi: `npm run export:catalog` (script-i: `scripts/export-catalog.mjs`)
- Fotografitë e produkteve mbeten të strehuara në `shemopharm.com/wp-content/uploads/…`
  (shih `remotePatterns` në `next.config.ts`). **Para se të fiket faqja e vjetër,
  fotografitë duhet të kopjohen** në një hosting të ri ose në `public/`.

## Llogaritë dhe çmimet (B2B)

Çmimet shfaqen **vetëm** për llogaritë e verifikuara — kontrolli bëhet gjithmonë
në server (`src/lib/auth.ts` → `canSeePrices`). Vizitorët e paidentifikuar dhe
llogaritë në pritje nuk marrin asnjë të dhënë çmimi në HTML apo API.

- Përdoruesit ruhen në `data/users.json` (jashtë git-it).
- Regjistrimet e reja marrin status `pending`; për t'i aprovuar, ndryshoni
  statusin në `approved` në atë skedar (ose ndërtoni një panel administrimi).
- Llogaria demo për testim: `demo@shemopharm.com` / `Demo2026!` (e aprovuar).
- Në produksion vendosni `AUTH_SECRET` si variabël mjedisi (opsionale në dev —
  gjenerohet automatikisht në `data/.auth-secret`).

Llogaritë e klientëve nga faqja e vjetër WordPress **nuk mund të migrohen** pa
qasje në bazën e të dhënave të saj; klientët duhet të regjistrohen sërish.

## Shporta (kërkesë porosie)

Shporta nuk është checkout: mbledh produkte + sasi në localStorage dhe e dërgon
porosinë si tekst përmes WhatsApp ose email (`/shporta`). Totali shfaqet vetëm
për llogaritë e verifikuara (çmimet vijnë gjithmonë të kontrolluara nga serveri
përmes `/api/lista`).

## Oferta

`/oferta` shfaq produktet me çmim të ulur real nga eksporti (aktualisht 0) dhe
një listë të kuruar në `src/data/offers.json` — shtoni slug-e produktesh aty
për t'i publikuar si oferta. Asnjë përqindje zbritjeje nuk shpiket.

## Formulari i kontaktit dhe newsletter

Mesazhet ruhen në `data/messages.json`, abonimet në `data/newsletter.json`.
**TODO:** lidhini me email/mjet marketingu te `src/lib/contact-actions.ts` dhe
`src/lib/newsletter-actions.ts` — validimi dhe UI mbeten të pandryshuara.

## Fotografitë

- `public/photos/depo.jpg` — foto reale e njësisë së SHEMO (nga faqja e vjetër).
- `public/photos/keshillim.jpg` — foto stock (Unsplash, licencë falas) si
  vendmbajtëse derisa të ketë fotografi reale të ekipit.
- `public/logo-symbol.svg` — simboli i logos i nxjerrë nga `logo.svg` origjinal
  (pa rivizatim), i përdorur në footer-in e errët.

## Dizajni

Hero-ja dhe theksuesit e ndritshëm janë frymëzuar nga Jara Pharmacy (projekt
tjetër i të njëjtit zhvillues), por të ripunuar plotësisht me logon dhe
ngjyrat origjinale të SHEMO (mor #834B9B, bruz #14B590 — token-et në
`src/app/globals.css`). Përdoret `framer-motion` për reveal-e të buta gjatë
scroll-it (respekton `prefers-reduced-motion`). Disa seksione në ballinë janë
slider horizontal me shigjeta (`src/components/ui/CardSlider.tsx`, e
përdorur nga kategoritë, "Pse SHEMO PHARM", produktet dhe markat).

Nuk ka hartë/lokacion në `/kontakti` — SHEMO ka një njësi të vetme, kontakti
mbulohet nga telefoni, WhatsApp, email dhe formulari.

## Çështje që presin konfirmim nga biznesi

- Kuptimi i statistikës "200+ Distributor i autorizuar" nga faqja e vjetër —
  aktualisht shfaqet si "200+ Partnerë dhe brende" (`src/lib/site.ts`).
- URL-të e sakta të Instagram/YouTube (vetëm Facebook u verifikua).
- Numri që pranon WhatsApp (supozuar 049 600 934).
- Katalog PDF nuk ekziston — butoni "Katalogu" shfaqet automatikisht kur të
  vendoset `catalogUrl` te `src/lib/site.ts`.
