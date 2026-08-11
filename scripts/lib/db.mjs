/**
 * Shared Postgres access for the scripts, so a script never grows its own
 * copy of the .env parser. `loadEnv` used to be pasted into every script that
 * touched the database; the copies had already drifted (one accepted only
 * uppercase keys).
 *
 * It also decides *which* database a script talks to, and that is the important
 * part. Until now every script read DATABASE_URL out of .env.local, and
 * .env.local held the production connection string — so `node scripts/anything`
 * wrote to the live site, and the only thing standing between a half-finished
 * migration and real customer data was whoever was typing. Now the default is the
 * development database and production has to be asked for by name.
 */
import { readFileSync, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { neon } from "@neondatabase/serverless";

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");

function loadEnvFile(file) {
  if (!existsSync(file)) return;
  for (const line of readFileSync(file, "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
    if (!m) continue;
    let [, key, val] = m;
    val = val.trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    // First file wins, and a real environment variable always wins over both.
    if (!(key in process.env)) process.env[key] = val;
  }
}

/**
 * Same precedence Next.js uses for `next dev`, so a script and the dev server
 * cannot end up pointing at different databases:
 * .env.development.local > .env.local > .env
 */
export function loadEnv() {
  loadEnvFile(path.join(ROOT, ".env.development.local"));
  loadEnvFile(path.join(ROOT, ".env.local"));
  loadEnvFile(path.join(ROOT, ".env"));
}

/**
 * Which database this run is for.
 *
 * "development" unless DATABASE_TARGET says otherwise. Deliberately a word rather
 * than a boolean flag: `DATABASE_TARGET=production` is a sentence somebody has to
 * mean, where `--prod` is a thing fingers do.
 */
export function target() {
  const value = (process.env.DATABASE_TARGET ?? "development").trim().toLowerCase();
  if (value !== "development" && value !== "production") {
    throw new Error(
      `DATABASE_TARGET must be "development" or "production" (got "${value}")`
    );
  }
  return value;
}

/** The connection string for `target()`, and the variable it came from. */
function resolveUrl() {
  loadEnv();
  const which = target();

  if (which === "production") {
    // Never falls back to DATABASE_URL. If a production run had to guess, the
    // guess would be whatever happened to be configured — which is the failure
    // this whole module exists to remove.
    const url = process.env.DATABASE_URL_PRODUCTION;
    if (!url) {
      throw new Error(
        "DATABASE_TARGET=production needs DATABASE_URL_PRODUCTION set (see .env.example)"
      );
    }
    return { url, from: "DATABASE_URL_PRODUCTION" };
  }

  const url = process.env.DATABASE_URL_DEVELOPMENT ?? process.env.DATABASE_URL;
  if (!url) {
    throw new Error(
      "No development database configured. Set DATABASE_URL_DEVELOPMENT in " +
        ".env.development.local (see db/README.md), or DATABASE_TARGET=production " +
        "to work against the live database on purpose."
    );
  }
  return {
    url,
    from: process.env.DATABASE_URL_DEVELOPMENT ? "DATABASE_URL_DEVELOPMENT" : "DATABASE_URL",
  };
}

/** Host and database name only — safe to print, no credentials. */
function describeUrl(url) {
  try {
    const parsed = new URL(url);
    return `${parsed.hostname}${parsed.pathname}`;
  } catch {
    return "an unparseable connection string";
  }
}

/** One line a script can print to say where it is about to write. */
export function describeTarget() {
  const { url, from } = resolveUrl();
  return `${target()} (${from}: ${describeUrl(url)})`;
}

/**
 * Throws rather than returning a client that would fail on first query.
 *
 * Always announces the target. A script that writes to the wrong database
 * silently is the whole problem; one that says "production" on the line above the
 * damage at least leaves a trace in the terminal.
 */
export function connect() {
  const { url, from } = resolveUrl();
  const which = target();

  const banner =
    which === "production"
      ? `!! PRODUCTION database — ${describeUrl(url)} (${from})`
      : `-- development database — ${describeUrl(url)} (${from})`;
  console.log(banner);

  return neon(url);
}

export const dataPath = (name) => path.join(ROOT, "src/data", name);
export const readJson = (file) => JSON.parse(readFileSync(file, "utf8"));
