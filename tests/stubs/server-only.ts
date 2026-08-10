/**
 * Stands in for the `server-only` package under Vitest.
 *
 * The real package throws on import unless the bundler resolves it with the
 * `react-server` condition. That guard is doing its job in the app; in a test
 * runner it would simply stop every server module from loading.
 */
export {};
