import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

/**
 * Unit tests for the pure logic — no database, no rendering.
 *
 * Two aliases are all the plumbing this needs:
 *
 *   @            the same path alias tsconfig.json gives the app.
 *   server-only  a marker package whose only job is to throw when it is
 *                imported outside a React Server Component. Vitest is neither,
 *                so it is stubbed out; the modules under test are still the
 *                real ones.
 *
 * The env vars stand in for the two module-level throws in src/lib/db.ts and
 * src/lib/auth.ts. Nothing here connects to Neon — the connection string is
 * only ever parsed.
 */
export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    env: {
      DATABASE_URL: "postgresql://test:test@localhost/test",
      AUTH_SECRET: "test-secret-for-unit-tests-only",
    },
  },
  resolve: {
    alias: {
      "server-only": fileURLToPath(new URL("./tests/stubs/server-only.ts", import.meta.url)),
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
});
