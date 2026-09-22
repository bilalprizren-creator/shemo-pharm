/**
 * Reads the old catalogue's MySQL dump — the database behind shemo-katalog.com,
 * handed over by the owner on 2026-09-22 as `u600177787_shemo.sql` (kept under
 * reference/old-katalog/, gitignored).
 *
 * The page only ever showed what that database calls active; the dump also
 * holds the inactive rows, the prices and the section numbers, which is why
 * scripts/import-old-catalog-db.mjs reads this and not the HTML.
 *
 * A reader for phpMyAdmin's INSERT statements, not a SQL parser: strings in
 * single quotes with backslash escapes and '' doubling, NULL, bare numbers.
 * Values come back as trimmed strings (the dump pads many of them with a space)
 * and NULL as null.
 *
 * The dump also holds a `users` table with password hashes. Nothing here reads
 * a table it is not asked for, and no caller asks for that one.
 */
import { readFileSync } from "node:fs";

const QUOTE = "'";
const BACKSLASH = "\\";
const SPACE = /\s/;

/**
 * Rows of each named table, as objects keyed by column name.
 *
 * @param {string} text
 * @param {string[]} tables
 * @returns {Record<string, Array<Record<string, string | null>>>}
 */
export function parseDumpTables(text, tables) {
  const result = {};
  for (const table of tables) result[table] = readInserts(text, table);
  return result;
}

export function readDump(file, tables) {
  return parseDumpTables(readFileSync(file, "utf8"), tables);
}

function readInserts(s, table) {
  const rows = [];
  const head = "INSERT INTO `" + table + "` (";
  let at = 0;
  while ((at = s.indexOf(head, at)) !== -1) {
    const close = s.indexOf(")", at);
    const cols = s
      .slice(at + head.length, close)
      .split(",")
      .map((c) => c.trim().replace(/`/g, ""));
    let i = s.indexOf("VALUES", close) + "VALUES".length;
    while (SPACE.test(s[i])) i++;

    while (s[i] === "(") {
      i++;
      const vals = [];
      let cur = "";
      let inString = false;
      let quoted = false;
      for (; i < s.length; i++) {
        const ch = s[i];
        if (inString) {
          if (ch === BACKSLASH) {
            cur += unescape(s[++i]);
          } else if (ch === QUOTE) {
            if (s[i + 1] === QUOTE) {
              cur += QUOTE;
              i++;
            } else {
              inString = false;
            }
          } else {
            cur += ch;
          }
          continue;
        }
        if (ch === QUOTE) {
          inString = true;
          quoted = true;
        } else if (ch === "," || ch === ")") {
          const v = cur.trim();
          vals.push(!quoted && v === "NULL" ? null : v);
          cur = "";
          quoted = false;
          if (ch === ")") {
            i++;
            break;
          }
        } else {
          cur += ch;
        }
      }
      if (vals.length !== cols.length) {
        throw new Error(`${table}: row ${rows.length + 1} has ${vals.length} values for ${cols.length} columns`);
      }
      rows.push(Object.fromEntries(cols.map((c, k) => [c, vals[k]])));
      if (s[i] !== ",") break;
      i++;
      while (SPACE.test(s[i])) i++;
    }
    at = i;
  }
  return rows;
}

/** MySQL's escapes: \n \r \t \0 stand for characters, anything else for itself. */
function unescape(ch) {
  return { n: "\n", r: "\r", t: "\t", 0: "\0" }[ch] ?? ch;
}
