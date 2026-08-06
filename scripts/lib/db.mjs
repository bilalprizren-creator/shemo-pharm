/**
 * Shared Postgres access for the scripts, so a script never grows its own
 * copy of the .env parser. `loadEnv` used to be pasted into every script that
 * touched the database; the copies had already drifted (one accepted only
 * uppercase keys).
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

export function loadEnv() {
  loadEnvFile(path.join(ROOT, ".env.local"));
  loadEnvFile(path.join(ROOT, ".env"));
}

/** Throws rather than returning a client that would fail on first query. */
export function connect() {
  loadEnv();
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is not set (looked in .env.local and .env)");
  }
  return neon(process.env.DATABASE_URL);
}

export const dataPath = (name) => path.join(ROOT, "src/data", name);
export const readJson = (file) => JSON.parse(readFileSync(file, "utf8"));
