import { describe, expect, it } from "vitest";

import { distanceToPercentage } from "@/domain/water/TankLevelSensor";

describe("tank domain utils", () => {
  it("computes percentage from distance/height", () => {
    expect(distanceToPercentage(0, 100)).toBe(100);
    expect(distanceToPercentage(50, 100)).toBe(50);
    expect(distanceToPercentage(100, 100)).toBe(0);
    expect(distanceToPercentage(150, 100)).toBe(0);
    expect(distanceToPercentage(10, 0)).toBe(0);
  });
});
