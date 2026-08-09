/**
 * The cache tag the catalog is stored under.
 *
 * Its own module so that anything which only needs to *invalidate* the
 * catalog — admin actions, migration-facing code — does not have to import
 * the catalog layer (and with it `server-only` and the database client)
 * just to name a string.
 */
export const CATALOG_TAG = "catalog";
