# Security review — 2026-08-11

Full audit of the frontend, admin panel, APIs, database access and deployment
posture, with the Critical and High findings fixed in the same pass. Verified
against a production build (`next build && next start`) on `next@16.2.12`.

This is not a claim that the site cannot be attacked. It is a record of what was
found, what was fixed, what was tested, and what is still open.

---

## 1. Vulnerabilities found

Severity reflects this deployment: one live site, five accounts, no card data.

### Critical

**C1 · `next@16.2.10` carried nine published advisories, all fixed in 16.2.11.**
Two were directly load-bearing. `GHSA-6gpp-xcg3-4w24` is a proxy bypass in App
Router apps with a single locale — this project's exact shape, since `src/proxy.ts`
does the locale rewrite *and* is the only thing that sets the CSP header, so a
bypass silently drops the policy. `GHSA-955p-x3mx-jcvp` is unauthenticated
disclosure of internal Server Function endpoints, and the entire admin mutation
surface here is Server Actions. Also: SSRF in rewrites, SSRF in Server Actions on
custom servers, two cache-confusion-of-response-bodies issues, unbounded Server
Action payload, DoS in Server Actions, DoS in the Image Optimization API via SVG.
Remotely reachable, no authentication needed.

### High

**H1 · The upload could not validate what it stored.** The route issued a signed
token and the browser wrote straight to the blob store, so the server never saw
the bytes: no file-signature check, no dimension limit, and the *client* chose the
object name (`blobPath()` in `ImageUploadField.tsx`). An admin session — or a
stolen one — was enough to park arbitrary content at a public URL under a `.png`
name. Partly mitigated before the fix by `allowedContentTypes`, the store's
`Content-Disposition: attachment`, and the store being a separate origin.

**H2 · No session revocation existed anywhere.** The JWT *was* the session — no
session table, no `jti`, no denylist. `clearSessionCookie()` deleted only the
browser's copy, so a captured cookie stayed valid for its full seven days and
logout did nothing about it; a password reset explicitly left other sessions
alive. The only kill switch was rotating `AUTH_SECRET`, which logs out every user
and breaks every outstanding verification and reset link.

**H3 · Rate limiting was per-instance and far weaker than it read.** The limiter
was an in-process `Map`, so on Vercel the effective ceiling was `limit` × warm
instances. The admin login's nominal 10-per-10-minutes was not a brute-force
bound.

**H4 · CSP was advisory, unverifiable, and possibly not sent.** `REPORT_ONLY =
true`, so `object-src 'none'`, `frame-ancestors`, `base-uri`, `form-action` and
the nonce-based `script-src` enforced nothing. No `report-uri`/`report-to`, so
violations existed only in whichever browser console happened to be open — there
was no evidence base for deciding to enforce. Compounded by C1, which can drop the
header entirely.

### Medium

| | Finding |
|---|---|
| M1 | Session cookie's `secure` was gated on `NODE_ENV === "production"`, which is false on a preview deployment and in a test build — both served over HTTPS. |
| M2 | `getSession` accepted a token with **no** `purpose` claim, undercutting the separation that stops a verification or reset token being pasted into the cookie. |
| M3 | Mutating route handlers had no CSRF defence. Server Actions get Next's Origin/Host check; `/api/admin/upload` is a plain route handler and got none — only `SameSite=Lax` stood there. |
| M4 | `src/lib/admin-data.ts` had no guard of its own; `getAdminProduct` returns hidden products and trusted its caller. |
| M5 | `redirectIfAdmin` was an exported Server Action with zero callers — every export of a `"use server"` file is a POST-reachable endpoint. |
| M6 | Admin sessions lasted seven days, same as customers'. |
| M7 | `adminLoginAction` checked `role` but not `status === "approved"`. |
| M8 | The dev mail log printed full bodies (including reset links) whenever `NODE_ENV !== "production"` — also true for `test` and unset. |
| M9 | `.env.local`'s `DATABASE_URL` points at the **production** database. Any local script writes to live data. **Not fixed — needs a decision.** |
| M10 | No schema or migration files in version control. `products`, `users`, `categories`, `product_categories`, `contact_messages` were created out-of-band and their definitions exist nowhere in the repo. **Not fixed — recovery risk.** |

### Low

`logOrderAction` omitted the `hidden = false` filter every other product read
applies, so a withdrawn product's name and price could land in an order row ·
`ImageUploadField` rendered raw provider error text into the admin UI · scrypt runs
at default cost with no pepper · `scripts/seed-db.mjs` seeds a demo customer with
a literal password · `brace-expansion` and `js-yaml` advisories sit in eslint's
dev-only chain, not runtime-reachable · no `typecheck` npm script.

### Verified NOT vulnerable

- **SQL injection: none.** Every query is a Neon tagged template. No `sql.unsafe`,
  no `sql.query`, no string-concatenated SQL anywhere in `src/`. Ids are gated with
  `Number.isInteger`, arrays go through `= ANY(${ids})`, JSON through `::jsonb`.
- **No secrets in the repository or its history.** `git ls-files` matches nothing
  env- or key-shaped; no `.env` was ever committed; `.gitignore` covers `.env*`.
  The only connection string in tracked code is the dummy
  `postgresql://test:test@localhost/test` in `vitest.config.mts`.
- **Admin authorization was already correct at every page and action.** All 11
  panel pages call `requireAdmin()` as their first statement, before any `sql`. All
  13 mutating Server Actions do the same.
- **No mass assignment.** Every admin form goes through an explicit zod field list;
  order prices and product names are resolved server-side from the database, never
  taken from client input.
- **No XSS path found.** Customer text reaches the panel through JSX (escaped) and
  HTML mail through `escapeHtml`; JSON-LD escapes `<`.
- **Public users have no database access at all.** No client-side DB path,
  `src/lib/db.ts` is `server-only`, the connection string is env-only. There is no
  anon role and no Data API in the request path — the only way to reach the
  database is through code that runs on the server.
- **Reset tokens are effectively single-use** via the `pw` hash fingerprint, 1h
  expiry against verification's 24h.
- **`robots.txt` disallows `/admin` and `/api/`**; the admin layout sets `noindex`.

---

## 2. Fixes implemented

### The upload, rebuilt server-side

`src/app/api/admin/upload/route.ts` no longer issues tokens. The file comes through
the function and every question is asked of the bytes:

1. origin, then session (`requireAdminApi`) — origin first, so a CSRF probe costs
   no database query;
2. rate limit;
3. `multipart/form-data`, then `Content-Length` **before** the body is buffered;
4. `file.size` again after parsing (`Content-Length` is the caller's claim);
5. the declared MIME, the filename's extension and **the file's actual signature**
   must all name the same one of PNG / JPEG / WebP — checking that three
   independent claims agree is stronger than checking any one;
6. dimensions read from the header, bounded 16–4096 px;
7. stored under `products/<32 hex>.<ext>` from `crypto.randomBytes(16)`, with the
   extension and `contentType` from the **sniffed** format, `addRandomSuffix:
   false`, `allowOverwrite: false`.

`src/lib/image-sniff.ts` is a new dependency-free parser for PNG (IHDR), JPEG
(marker walk, with `C4`/`C8`/`CC` correctly excluded from the SOF set) and WebP
(`VP8 `, `VP8L` and `VP8X` — the last is what modern encoders emit for alpha, so
omitting it would reject valid files). Everything else returns null. **SVG, HTML,
`MZ`, ELF, `#!`, ZIP, PDF, GIF, BMP and TIFF are refused by construction**, not by
a deny list. `sharp` stays a devDependency — a native binary's cold start is not
worth paying for what ninety lines of header parsing give.

`MAX_UPLOAD_BYTES` is 2 MB, down from 5 MB. Vercel caps a function's whole request
body at 4.5 MB and that is not configurable, so this sits well under it rather than
on the edge of a limit that answers with an opaque platform 413. The largest photo
in the catalogue is 45 KB.

**This is also the repair of the broken upload.** `@vercel/blob/client` used to
replace every non-OK answer from our token route with one fixed string, so 401, 429
and 400 all reached the editor looking identical and the code had to guess at
causes. The client now reads our JSON directly and each condition gets its true
message — including the suspended store.

### Sessions

- `src/lib/session-cookie.ts` (new, pure) holds the cookie's shape and the
  revocation comparison, so both are unit-testable — `auth.ts` cannot be imported
  by a test.
- `secure: !isDev` instead of `NODE_ENV === "production"` (M1).
- `payload.purpose !== "session"` → reject, with no legacy branch (M2). Safe with
  nobody logged out: the claim landed in `f56d1e7` on 2026-08-04 and a session
  lives seven days, so the last purpose-less cookie expired on 2026-08-11.
- **Real revocation** (H2): `users.sessions_valid_from`, compared against the
  token's existing `iat` claim — so no cookie needs reissuing and it costs zero
  extra queries, because `getSession` already does `SELECT *`. Set by
  `revokeSessions()` from both logout actions and folded into `setPassword()`'s
  existing statement.
- `ADMIN_SESSION_DAYS = 1` (M6): a stolen admin cookie dies in a day, not a week.
- **Not done: renaming to `__Host-shemo_session`.** The cookie already satisfies
  every condition that prefix enforces, so it would only stop an attacker who can
  *set* a cookie on a sibling subdomain or over plain http — against a cookie
  that is already `httpOnly` + `Lax` + `Secure`. It costs a dual-read grace path
  and breaks Safari on `http://localhost`. The recipe is in a comment.

### Rate limiting

`rate_limits` table + one atomic `INSERT … ON CONFLICT DO UPDATE … RETURNING
count`. The window start is computed **in SQL from `now()`**, so clock skew between
instances cannot split one window and double the allowance. `subject` is a keyed
hash of the IP (`sha256(ip + AUTH_SECRET)`), so the table holds no personal data.

`rateLimited(bucket, {limit, windowMs})` keeps its exact signature — none of the
twelve call sites changed. Durable buckets: `admin-auth`, `auth`, `reset-request`,
`reset-submit`, `verify`, `contact`, `order`, `admin-upload`. `search` and `lista`
stay in memory: `/api/kerko` fires on a debounced keystroke and is CDN-cached, so a
Neon round trip there would be a visible latency regression protecting a read-only
endpoint. Gated on `process.env.VERCEL` so local dev does not hit Neon per
keystroke; `RATE_LIMIT_STORE=postgres` forces it on.

**Fails open, deliberately**, falling back to the in-memory store and logging
loudly. Every path this guards has a stronger gate behind it — password
verification, `requireAdmin()`, the per-address send cooldowns — so failing closed
would turn a Neon blip into a site-wide login and search outage to close an abuse
window measured in seconds.

Cleanup is probabilistic (1-in-500, inside `after()`), so there is no cron, no
route and no `vercel.json`.

### CSRF / authorization

- `src/lib/origin.ts` (pure) — `isSameOrigin`, mirroring what Next does for Server
  Actions: prefers `x-forwarded-host`, takes the first comma-separated hop,
  compares host including port, rejects a missing Origin, `"null"`, and non-http(s)
  schemes.
- `src/lib/api-guard.ts` — `requireAdminApi(request, { mutating })` returning a
  tagged union `{ ok: true, value } | { ok: false, response }`, not
  `Session | NextResponse`: with `ok`, forgetting to check is a compile error
  rather than a response object typed as a session whose every field is undefined.
- `assertAdmin()` (throwing, not redirecting) at the top of every export in
  `src/lib/admin-data.ts` (M4). Free — `getSession` is memoized per request.
- `redirectIfAdmin` deleted (M5); `status === "approved"` added to the admin login
  (M7).

**Consequence worth knowing:** `curl -X POST` against `/api/admin/upload` now needs
`-H "Origin: https://<host>"`.

### CSP

- `connect-src` drops `https://vercel.com` and becomes `'self'` — the browser no
  longer talks to the blob API, so the allowance is gone.
- `report-uri /api/csp-report` and `report-to csp-endpoint`, plus a
  `Reporting-Endpoints` response header. Both spellings: `report-to` is current,
  `report-uri` is what several browsers actually act on.
- New `src/app/api/csp-report/route.ts`: POST only, no auth and **no origin check**
  (browsers send reports with `Origin: null` or none), 8 KB cap, rate-limited in
  memory, accepts both wire formats, always 204. Logs a whitelisted subset with
  **query strings stripped** — a violation on a page reached from a verification
  link would otherwise put that token in the logs. **Reports go to the runtime log,
  never to Postgres**: an unauthenticated unbounded browser-driven write path on a
  free tier is exactly what suspended the blob store once already.
- `next.config.ts` gains `/api/:path*` → `default-src 'none'; frame-ancestors
  'none'; sandbox`. The proxy matcher keeps excluding `api`: a matched path has its
  whole request body cloned and buffered so it can be read twice, which would
  double the upload route's peak memory for no benefit.
- **`REPORT_ONLY` stays `true`.** See §5.
- **HSTS stays out of the app.** Vercel already sends it, and a hand-rolled
  `max-age` or stray `preload` is an outage you cannot roll back inside the
  browser's cache window.

### Audit logging

`src/lib/security-log.ts` — one line of JSON per event on `console.warn`, prefixed
`[security]`, so a drain filter or alert rule can pick it out. Covers admin login
success/failure/not-admin/rate-limited, logout, upload accept and every rejection
with its reason, API unauthorized and bad-origin, and the destructive admin
mutations (approve/revoke/delete user, create/update/delete product, delete
message, delete order). Never carries passwords, hashes or tokens.

Deliberately not a table: an `admin_audit` table is a third migration and a
retention decision, not a fix. See §5.

### Other

`logOrderAction` now filters `hidden = false` · the dev mail log is gated on
`=== "development"` rather than `!== "production"` (M8) · `npm run typecheck` added,
plus `migrate:sessions` and `migrate:rate-limits` · `next` and `eslint-config-next`
to `16.2.12` in lockstep.

---

## 3. Tests performed and results

### Automated

| Command | Result |
|---|---|
| `npm run lint` | 0 errors, 2 warnings (both pre-existing, in `scripts/*.mjs`) |
| `npm run typecheck` | no errors |
| `npm test` | **14 files, 171 tests, all passing** (was 8 files / 118) |
| `npm audit` | all 9 `next` advisories cleared |
| `npm run build` | clean; `/api/csp-report` registered |

Six new test files: `image-sniff` (52 cases incl. every refused format),
`upload-name`, `origin` (14), `session-cookie` (13), `rate-limit-core` (13),
`upload-status`. `tests/upload-errors.test.ts` passes **unchanged**, which is the
check that the client's error semantics survived the rewrite.

### Manual, against the production build

**Upload — 23 of 23 cases correct:**

| Case | Answer |
|---|---|
| no cookie / customer cookie / forged cookie (wrong key) | `401 unauthorized` |
| wrong-purpose token in the cookie | `401 unauthorized` |
| **purpose-less token** (the closed M2 hole) | `401 unauthorized` |
| no Origin / cross-site Origin / `Origin: null` | `403 bad_origin` |
| SVG renamed `.png`, HTML renamed `.jpg` | `422 not_an_image` |
| real JPEG named `.png` | `422 type_mismatch` |
| 5000×5000, and 8×8 | `422 bad_dimensions` |
| `text/plain` declared; `.txt` name with `image/png` declared | `415 bad_type` / `bad_ext` |
| empty file; no file field | `400 no_file` |
| not multipart | `415 bad_type` |
| 18 MB body | `413 too_large` |
| **valid PNG, JPEG, lossy WebP, alpha WebP (VP8X)** | passed every check, reached `put()`, `503 store_suspended` |

Every failure body was exactly `{"error":"<code>"}` — no stack, path or provider
text.

**That last row is the honest state of the upload.** All four genuine images passed
signature, dimension, agreement and naming checks and reached the store; the store
refused the write because its billing is inactive, and the route correctly reported
`store_suspended`, which the panel renders as "the store is suspended, retrying
will not help". A successful write could not be demonstrated.

**Rate limiting:** 33 requests against `admin-upload` (limit 30/min) → exactly 30
allowed, 31st onward `429`. The Postgres statement was verified directly against
the real table: sequential counts 1–12 with the limit tripping at 11; a second
subject independent; **10 concurrent hits produced 10 distinct counts with no lost
updates** (the property a read-then-write would break); window floored to the
10-minute boundary; prune statement ran; test rows removed.

**Session revocation:** captured cookie → `200` on `/admin`; revoke; **same cookie
→ `307 /admin/login`**; a freshly issued cookie → `200`. The account was restored
to its prior state.

**Admin route protection:** all 7 panel paths → `307 /admin/login` with no session
*and* with a customer session; all 7 → `200` with an admin session (which also
proves the new `assertAdmin()` in the DAL did not break the panel).

**Admin UI, end to end** with a throwaway admin account, since deleted:
wrong password → generic "Të dhëna të pasakta." · correct password → panel ·
product created · a disallowed image host (`https://evil.example/steal.png`)
**rejected server-side** with the field error · valid edit saved · product deleted
(catalogue back to 2049) · logout → session dead, `/admin` redirects. The audit log
recorded create/update/delete with the actor and product id. Throwaway account and
test product removed; users back to 5.

**Headers**, production build: documents carry `nosniff`,
`Referrer-Policy: strict-origin-when-cross-origin`, `X-Frame-Options: SAMEORIGIN`,
`Permissions-Policy`, the report-only CSP with `connect-src 'self'` and both report
directives, and `Reporting-Endpoints`. `/admin` is covered. API responses carry the
locked-down CSP. No `x-powered-by` anywhere.

**CSP collector:** both wire formats logged; garbage body, 20 KB body and `GET` all
handled (204/204/405). Confirmed a `?token=…` in the document URL and a `?key=…` in
the blocked URL were **stripped** before logging.

### Not tested, and why

The route handler has no unit test — it needs `cookies()`, a request context and a
live store. Everything in it that can be wrong in an interesting way (sniffing,
dimensions, naming, origin, status mapping, window arithmetic, cookie options,
revocation comparison) lives in a pure module that is tested; the residue is a
fixed sequence of guard clauses, verified by hand above.

---

## 4. What must be configured manually in Vercel

I could not read this project from the Vercel API (the MCP returns 404 for it), so
these are all yours:

1. **Reactivate Blob billing.** Until then no upload can succeed, and the CSP
   enforcement decision stays gated.
2. **Run both migrations against production** if the deploy does not share
   `.env.local`'s database: `npm run migrate:sessions` and
   `npm run migrate:rate-limits`. Both are `IF NOT EXISTS` and safe to re-run.
   *(Already applied to the database `.env.local` points at.)*
3. **Firewall rate-limit rules, created in log-only mode**: `/admin/login`,
   `/api/admin/*`, `/api/kerko`, `/api/lista`, and the Server Action POST surface.
   Leave them logging, review a few days of matched production traffic, then decide
   what to block. A broad blocking rule on a live pharmacy site is a self-inflicted
   outage.
4. **Confirm env var scoping** — `AUTH_SECRET`, `DATABASE_URL`,
   `BLOB_READ_WRITE_TOKEN`, `RESEND_API_KEY` should be Production/Preview only, and
   none should ever be prefixed `NEXT_PUBLIC_`.
5. **Check Deployment Protection on preview deployments.** A preview with
   production data and no protection is an unauthenticated copy of the admin panel.
6. **Verify HSTS actually arrives** on `shemopharm.com`, since the app deliberately
   does not send it.
7. **Enable a log drain or alert** on `[security]` lines — at minimum on
   `"event":"admin-login-failed"`.
8. **Confirm Neon PITR / backup retention** and write down the restore procedure.
   This matters more than usual because of M10: the schema exists in no file.

---

## 5. Remaining risks — your decision, not a code change

- **CSP enforcement.** `REPORT_ONLY` stays `true`. The checklist is in
  `src/lib/csp.ts`. It cannot be completed today: item 2 requires walking the admin
  form through a real upload, and the store is suspended. Once billing is back:
  production build, walk both locales (homepage, filtered listing, product page
  with JSON-LD and gallery, cart drawer with a framer-motion animation actually
  running, contact form, search bar, register/login/verify/reset, every admin page,
  one real upload), confirm the collector stays quiet and that Next's script tags
  carry `nonce=` in view-source, then flip it and watch for 48 hours.
- **`admin_audit` table** versus log-only auditing — a retention and access
  question.
- **M9: dev and production share one database.** A local script writes to live
  data. Fixing this means provisioning a second Neon branch and is a change of
  working practice, not a patch.
- **M10: no schema in version control.** A real recovery risk, but writing a
  baseline migration for five existing tables is its own piece of work.
- **`__Host-` cookie prefix**, deferred with the recipe documented in
  `session-cookie.ts`.
- **scrypt cost parameters.** Raising them invalidates nothing (salt and hash are
  stored together) but needs a rehash-on-login path to be worth anything.
- **`next`'s own nested `postcss@8.4.31` and `sharp@0.34.5`** still carry
  advisories, and `next` pins both outside the fixed ranges. Not overridden: the
  postcss issues need attacker-controlled CSS, and this project's CSS is its own
  Tailwind source processed at build time; and on Vercel `next/image` is served by
  the platform's `/_vercel/image` service rather than the deployment's sharp — which
  the project's own transformation-quota comment in `next.config.ts` confirms. It
  does apply to a self-hosted `next start`. Forcing a native binary outside its
  declared range during a security pass risked breaking image serving on a live
  site; revisit when `next` bumps them.
- **Behaviour change to tell the editors about:** logging out now ends the account's
  sessions everywhere, not just in that browser, and an admin session lasts one day
  instead of seven. Both are intended; if a daily admin login is too much, three
  days is a defensible compromise and a one-line change.
