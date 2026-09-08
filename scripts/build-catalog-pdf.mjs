/**
 * Builds the printed catalogue as PDF files, once, so that nobody's browser has
 * to build it again.
 *
 *   npm run katalog:pdf                                  # against a local server
 *   node scripts/build-catalog-pdf.mjs --base https://shemo-pharm.vercel.app
 *   node scripts/build-catalog-pdf.mjs --only 6-7-cansin # one section
 *   node scripts/build-catalog-pdf.mjs --skip-sections   # the full run only
 *
 * Why this exists. /katalog/shtyp does not make a PDF — it lays 163 A4 sheets
 * out as HTML and leaves the typesetting to the visitor's browser. That meant
 * 1 713 photographs fetched and decoded, then Chrome rasterising 163 pages,
 * every time anybody pressed Print: minutes on a laptop, and 69 MB of it before
 * the print sheet moved to its own 384px copies. Doing it once here and serving
 * the file turns all of that into one download from the CDN.
 *
 * Why a headless browser rather than a PDF library. The sheet geometry already
 * exists — the `@page` rule and the grid in src/app/globals.css, the
 * twelve-per-sheet arithmetic in src/katalog/sheets.ts. A library would
 * describe the same layout a second time and the two would drift. This way
 * /katalog/shtyp stays the single definition of what a sheet looks like, and
 * this script only photographs it.
 *
 * What it needs. A running server at --base with the *production* database
 * behind it: the printed catalogue is edited in /admin/katalogu against the
 * live data, so a run against the development database would publish a
 * catalogue nobody has. Playwright's Chromium is a devDependency and is never
 * deployed — `npx playwright install chromium` once, and it lives outside the
 * repository.
 *
 * Afterwards: commit public/pdf/ and src/data/catalog-pdf.json together. The
 * manifest is what the site reads to find the files, count their pages, and
 * notice when they have fallen behind the database.
 */
import { chromium } from "playwright";
import { mkdir, readdir, rm, stat, writeFile } from "node:fs/promises";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");
const OUT_DIR = path.join(ROOT, "public", "pdf");
const SECTION_DIR = path.join(OUT_DIR, "seksionet");
const MANIFEST = path.join(ROOT, "src", "data", "catalog-pdf.json");

/** Generous, because these are waits for a whole catalogue, not for a click. */
const NAV_MS = 180_000;
const IMAGES_MS = 600_000;

function arg(name, fallback = null) {
  const i = process.argv.indexOf(`--${name}`);
  return i === -1 ? fallback : process.argv[i + 1];
}

const BASE = (arg("base", "http://localhost:3000") ?? "").replace(/\/$/, "");
const ONLY = arg("only");
const SKIP_SECTIONS = process.argv.includes("--skip-sections");

/**
 * The month goes in the filename so that a new run is a new URL. That is what
 * lets next.config.ts serve these `immutable`: nothing here is ever rewritten
 * in place, and a partner holding last month's link holds last month's file
 * until the deploy that drops it.
 */
const STAMP = new Date().toISOString().slice(0, 7);

const mb = (n) => `${(n / 1024 / 1024).toFixed(1)} MB`;

/**
 * Loads a print run, waits for it properly, and writes the PDF.
 *
 * The wait is not a nicety. page.pdf() freezes the page as it stands, and a run
 * whose photographs are still arriving becomes a catalogue of empty boxes — the
 * one failure this script exists to keep out of a partner's hands.
 *
 * Two conditions, and the first one is the one that is easy to miss. This route
 * has a loading.tsx, so React streams the sheets into a hidden staging element
 * and swaps them into place afterwards. In the window between those two things,
 * `.print-sheet img` already matches 1 713 loaded images while the page still
 * shows the skeleton — waiting only on the photographs printed a PDF of grey
 * placeholder boxes. An element inside the staging div measures zero, so the
 * height of the first sheet is what says the swap has happened.
 *
 * Then the photographs. `complete` turns true on failure as well as success, so
 * naturalWidth is checked separately below. A missing photograph is fatal here
 * where on the live page it is only a gap: this file is handed over and not
 * looked at again for a year.
 */
async function render(page, url, file) {
  await page.goto(url, { waitUntil: "domcontentloaded", timeout: NAV_MS });
  await page.waitForFunction(
    () => {
      const sheets = Array.from(document.querySelectorAll(".print-sheet"));
      if (!sheets.length || !sheets[0].getBoundingClientRect().height) return false;
      const images = Array.from(document.querySelectorAll(".print-sheet img"));
      return images.length > 0 && images.every((i) => i.complete);
    },
    undefined,
    { timeout: IMAGES_MS }
  );

  const broken = await page.$$eval(".print-sheet img", (images) =>
    images.filter((i) => !i.naturalWidth).map((i) => i.getAttribute("src"))
  );
  if (broken.length) {
    throw new Error(
      `${broken.length} photographs failed to load, first: ${broken[0]}. ` +
        `Run \`npm run images:thumbs\` — every source under public/products/ ` +
        `needs its 384px copy in public/products/print/.`
    );
  }

  await mkdir(path.dirname(file), { recursive: true });
  await page.pdf({
    path: file,
    // The @page rule in globals.css decides the paper and the margins. Passing
    // a format or a margin here would quietly overrule the stylesheet the
    // browser's own print dialog obeys, and the two outputs would stop matching.
    preferCSSPageSize: true,
    printBackground: true,
  });
  return (await stat(file)).size;
}

/** Every stale generation, so a deploy carries one catalogue and not four. */
async function dropOtherStamps(dir) {
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return 0;
  }
  let dropped = 0;
  for (const entry of entries) {
    if (!entry.isFile() || !entry.name.endsWith(".pdf")) continue;
    if (entry.name.includes(STAMP)) continue;
    await rm(path.join(dir, entry.name));
    dropped += 1;
  }
  return dropped;
}

async function main() {
  console.log(`base ${BASE} · stamp ${STAMP}`);
  const browser = await chromium.launch();
  const page = await browser.newPage();

  try {
    // The full run first, and not only because it is the main artefact: it is
    // also where the section list comes from. Every sheet carries the slug of
    // the section it belongs to, so one load answers which sections exist, in
    // printed order, and how many sheets each takes. Asking the contents page
    // instead would mean telling those links apart from /te-gjitha, /kerko and
    // /shtyp; asking the database would mean a second copy of
    // catalogSectionSlug() living in a script.
    const fullFile = path.join(OUT_DIR, `shemo-katalog-${STAMP}.pdf`);
    console.log("full run…");
    const fullBytes = await render(page, `${BASE}/katalog/shtyp`, fullFile);

    const { fingerprint, slugs } = await page.evaluate(() => ({
      fingerprint: document
        .querySelector("[data-fingerprint]")
        ?.getAttribute("data-fingerprint"),
      slugs: Array.from(document.querySelectorAll(".print-sheet")).map((el) =>
        el.getAttribute("data-section")
      ),
    }));
    if (!fingerprint) throw new Error("no data-fingerprint on the print page");

    const sheetsPerSection = new Map();
    for (const slug of slugs) {
      sheetsPerSection.set(slug, (sheetsPerSection.get(slug) ?? 0) + 1);
    }
    console.log(
      `  ${slugs.length} sheets · ${sheetsPerSection.size} sections · ` +
        `${mb(fullBytes)} · fingerprint ${fingerprint}`
    );

    const sections = {};
    const wanted = ONLY
      ? [...sheetsPerSection.keys()].filter((s) => s === ONLY)
      : [...sheetsPerSection.keys()];
    if (ONLY && !wanted.length) throw new Error(`no such section: ${ONLY}`);

    if (!SKIP_SECTIONS) {
      let n = 0;
      for (const slug of wanted) {
        n += 1;
        const file = path.join(SECTION_DIR, `${slug}-${STAMP}.pdf`);
        const bytes = await render(
          page,
          `${BASE}/katalog/shtyp?seksioni=${encodeURIComponent(slug)}`,
          file
        );
        sections[slug] = {
          file: `/pdf/seksionet/${slug}-${STAMP}.pdf`,
          bytes,
          sheets: sheetsPerSection.get(slug),
        };
        console.log(
          `  ${String(n).padStart(2)}/${wanted.length} ${slug} · ` +
            `${sheetsPerSection.get(slug)} sheets · ${mb(bytes)}`
        );
      }
    }

    const dropped =
      (await dropOtherStamps(OUT_DIR)) + (await dropOtherStamps(SECTION_DIR));
    if (dropped) console.log(`dropped ${dropped} file(s) from earlier runs`);

    await writeFile(
      MANIFEST,
      `${JSON.stringify(
        {
          generatedAt: new Date().toISOString(),
          fingerprint,
          full: {
            file: `/pdf/shemo-katalog-${STAMP}.pdf`,
            bytes: fullBytes,
            sheets: slugs.length,
          },
          sections,
        },
        null,
        2
      )}\n`
    );
    console.log(`wrote ${path.relative(ROOT, MANIFEST)}`);
  } finally {
    await browser.close();
  }
}

await main();
