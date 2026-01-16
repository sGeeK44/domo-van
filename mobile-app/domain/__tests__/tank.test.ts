import { describe, expect, it } from "vitest";

import {
  distanceToPercentage,
  parseDistanceMessage,
  parseTankConfigMessage,
} from "@/domain/water/TankLevelSensor";

describe("tank domain utils", () => {
  it("parses tank CFG messages", () => {
    expect(parseTankConfigMessage("CFG:V=120 H=450")).toEqual({
      volumeLiters: 120,
      heightMm: 450,
    });
    expect(parseTankConfigMessage(" CFG:V=1 H=2 ")).toEqual({
      volumeLiters: 1,
      heightMm: 2,
    });
    expect(parseTankConfigMessage("V=120 H=450")).toBeNull();
    expect(parseTankConfigMessage("CFG:V=xx H=450")).toBeNull();
  });

  it("parses distance messages", () => {
    expect(parseDistanceMessage("123")).toBe(123);
    expect(parseDistanceMessage(" 0 ")).toBe(0);
    expect(parseDistanceMessage("12.3")).toBeNull();
    expect(parseDistanceMessage("x")).toBeNull();
  });

  it("computes percentage from distance/height", () => {
    expect(distanceToPercentage(0, 100)).toBe(100);
    expect(distanceToPercentage(50, 100)).toBe(50);
    expect(distanceToPercentage(100, 100)).toBe(0);
    expect(distanceToPercentage(150, 100)).toBe(0);
    expect(distanceToPercentage(10, 0)).toBe(0);
  });
});
