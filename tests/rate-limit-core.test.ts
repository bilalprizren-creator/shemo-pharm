import { describe, expect, it, vi } from "vitest";
import {
  checkRateLimit,
  createMemoryStore,
  windowStartMs,
  type RateLimitHit,
  type RateLimitStore,
} from "@/lib/rate-limit-core";

/**
 * The limiter's arithmetic, with an injected clock and an injected store — so
 * "allows exactly ten and refuses the eleventh" is a test rather than something
 * verified by clicking a login form eleven times.
 */

const MINUTE = 60_000;

/** A store that answers with a fixed sequence, or throws. */
function fakeStore(counts: number[] | Error): RateLimitStore & { calls: RateLimitHit[] } {
  const calls: RateLimitHit[] = [];
  let i = 0;
  return {
    calls,
    async hit(args: RateLimitHit) {
      calls.push(args);
      if (counts instanceof Error) throw counts;
      return counts[i++] ?? counts[counts.length - 1]!;
    },
  };
}

describe("windowStartMs", () => {
  it("floors to a multiple of the window, so every instance agrees", () => {
    expect(windowStartMs(0, MINUTE)).toBe(0);
    expect(windowStartMs(1, MINUTE)).toBe(0);
    expect(windowStartMs(MINUTE - 1, MINUTE)).toBe(0);
    expect(windowStartMs(MINUTE, MINUTE)).toBe(MINUTE);
    expect(windowStartMs(MINUTE + 1, MINUTE)).toBe(MINUTE);
  });

  it("does not depend on when the first hit happened", () => {
    // The property that makes the memory and Postgres stores interchangeable:
    // the boundary is a function of the clock alone.
    expect(windowStartMs(90_000, MINUTE)).toBe(windowStartMs(119_999, MINUTE));
  });
});

describe("createMemoryStore", () => {
  const hit = (store: RateLimitStore, nowMs: number, subject = "a", bucket = "auth") =>
    store.hit({ bucket, subject, windowMs: MINUTE, nowMs });

  it("counts up within a window", async () => {
    const store = createMemoryStore();
    expect(await hit(store, 0)).toBe(1);
    expect(await hit(store, 10)).toBe(2);
    expect(await hit(store, 20)).toBe(3);
  });

  it("starts again at the window boundary", async () => {
    const store = createMemoryStore();
    await hit(store, 0);
    await hit(store, 30_000);
    expect(await hit(store, MINUTE)).toBe(1);
  });

  it("counts each subject separately", async () => {
    const store = createMemoryStore();
    await hit(store, 0, "a");
    await hit(store, 0, "a");
    expect(await hit(store, 0, "b")).toBe(1);
  });

  it("counts each bucket separately", async () => {
    const store = createMemoryStore();
    await hit(store, 0, "a", "auth");
    await hit(store, 0, "a", "auth");
    expect(await hit(store, 0, "a", "admin-auth")).toBe(1);
  });
});

describe("checkRateLimit", () => {
  const check = (store: RateLimitStore, limit: number, extra = {}) =>
    checkRateLimit({
      store,
      bucket: "admin-auth",
      subject: "hashed",
      limit,
      windowMs: MINUTE,
      nowMs: 0,
      ...extra,
    });

  it("allows exactly the limit and refuses the next one", async () => {
    const store = createMemoryStore();
    const results: boolean[] = [];
    for (let i = 0; i < 11; i += 1) {
      results.push(
        await checkRateLimit({
          store,
          bucket: "admin-auth",
          subject: "hashed",
          limit: 10,
          windowMs: MINUTE,
          nowMs: i,
        })
      );
    }
    expect(results.slice(0, 10)).toEqual(Array(10).fill(false));
    expect(results[10]).toBe(true);
  });

  it("lets the caller back in at the next window", async () => {
    const store = createMemoryStore();
    const over = { store, bucket: "auth", subject: "s", limit: 1, windowMs: MINUTE };
    expect(await checkRateLimit({ ...over, nowMs: 0 })).toBe(false);
    expect(await checkRateLimit({ ...over, nowMs: 1 })).toBe(true);
    expect(await checkRateLimit({ ...over, nowMs: MINUTE })).toBe(false);
  });

  it("passes the hit through to the store unchanged", async () => {
    const store = fakeStore([1]);
    await check(store, 10);
    expect(store.calls).toEqual([
      { bucket: "admin-auth", subject: "hashed", windowMs: MINUTE, nowMs: 0 },
    ]);
  });

  /**
   * Fail-open, deliberately. Every path this guards has a stronger gate behind it
   * — password verification, requireAdmin(), the per-address send cooldowns — so
   * failing closed would turn a Neon blip into a site-wide login outage to close
   * an abuse window measured in seconds.
   */
  it("falls back to the second store when the first throws", async () => {
    const broken = fakeStore(new Error("neon is unreachable"));
    const fallback = createMemoryStore();
    const onError = vi.fn();

    expect(await check(broken, 1, { fallback, onError })).toBe(false);
    expect(await check(broken, 1, { fallback, onError })).toBe(true);
    // Once per failed call, so the log says how long the degraded state lasted.
    expect(onError).toHaveBeenCalledTimes(2);
    expect(onError.mock.calls[0]?.[0]).toBeInstanceOf(Error);
  });

  it("allows the request when both stores are broken", async () => {
    const broken = fakeStore(new Error("down"));
    const alsoBroken = fakeStore(new Error("also down"));
    expect(await check(broken, 1, { fallback: alsoBroken })).toBe(false);
  });

  it("allows the request when the only store is broken and there is no fallback", async () => {
    expect(await check(fakeStore(new Error("down")), 1)).toBe(false);
  });

  it("reads the limit off the count the store returned", async () => {
    // Guards the boundary itself: a count equal to the limit is still allowed.
    expect(await check(fakeStore([10]), 10)).toBe(false);
    expect(await check(fakeStore([11]), 10)).toBe(true);
  });
});
