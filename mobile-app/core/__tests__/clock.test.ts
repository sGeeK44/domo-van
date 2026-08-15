import { describe, expect, it } from "vitest";
import { sinceBoot } from "@/core/clock";

describe("sinceBoot", () => {
  it("moves forward on its own, so a deadline measured on it elapses", async () => {
    const start = sinceBoot();
    await new Promise((resolve) => setTimeout(resolve, 5));

    expect(sinceBoot()).toBeGreaterThan(start);
  });

  it("keeps counting when the wall clock steps backwards", () => {
    const wallClock = Date.now;
    Date.now = () => 0;
    try {
      const start = sinceBoot();

      expect(sinceBoot()).toBeGreaterThanOrEqual(start);
    } finally {
      Date.now = wallClock;
    }
  });
});
