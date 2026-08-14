import { describe, expect, it } from "vitest";
import { clockTime, drainedLiters } from "@/components/water/drain-view";

describe("what the grey tank reports while it drains", () => {
  it("counts what the tank has lost since the valve opened", () => {
    expect(drainedLiters(33, 21)).toBe(12);
  });

  it("reports nothing lost when the level has not moved yet", () => {
    expect(drainedLiters(33, 33)).toBe(0);
  });

  // A sensor that reads back up mid-drain would otherwise print a negative loss.
  it("never reports a negative loss", () => {
    expect(drainedLiters(33, 35)).toBe(0);
  });

  it("names the time the drain started, padded to two digits", () => {
    expect(clockTime(new Date(2026, 0, 1, 15, 44))).toBe("15:44");
    expect(clockTime(new Date(2026, 0, 1, 9, 5))).toBe("09:05");
  });
});
