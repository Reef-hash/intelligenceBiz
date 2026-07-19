import { describe, it, expect } from "vitest";
import { nextBackoffDelay, sleep } from "./backoff.js";

describe("nextBackoffDelay", () => {
  it("returns initial delay for attempt 0", () => {
    expect(nextBackoffDelay(0)).toBe(1000);
  });

  it("doubles each attempt", () => {
    expect(nextBackoffDelay(1)).toBe(2000);
    expect(nextBackoffDelay(2)).toBe(4000);
    expect(nextBackoffDelay(3)).toBe(8000);
  });

  it("caps at maxDelayMs", () => {
    expect(nextBackoffDelay(10)).toBe(60_000);
  });

  it("respects custom options", () => {
    expect(nextBackoffDelay(0, { initialDelayMs: 500 })).toBe(500);
    expect(nextBackoffDelay(1, { factor: 3 })).toBe(3000);
    expect(nextBackoffDelay(10, { maxDelayMs: 5000 })).toBe(5000);
  });
});

describe("sleep", () => {
  it("resolves after the given time", async () => {
    const start = Date.now();
    await sleep(10);
    expect(Date.now() - start).toBeGreaterThanOrEqual(5);
  });
});
