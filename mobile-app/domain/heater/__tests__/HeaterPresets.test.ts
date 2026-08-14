import { describe, expect, it } from "vitest";
import {
  MAX_SETPOINT_CELSIUS,
  MIN_SETPOINT_CELSIUS,
  zoneRatio,
} from "@/domain/heater/HeaterPresets";

describe("where a temperature sits on a zone bar", () => {
  it("spans 10 to 30 °C, whatever the target range allows", () => {
    expect(zoneRatio(10)).toBe(0);
    expect(zoneRatio(20)).toBe(0.5);
    expect(zoneRatio(30)).toBe(1);
  });

  it("reads a fifth of the bar per 4 °C in between", () => {
    expect(zoneRatio(14)).toBeCloseTo(0.2);
    expect(zoneRatio(21.5)).toBeCloseTo(0.575);
  });

  // The bar floor sits above the lowest target the screen allows, so under-range is reachable.
  it("clamps a reading the bar cannot show", () => {
    expect(zoneRatio(MIN_SETPOINT_CELSIUS)).toBe(0);
    expect(zoneRatio(-40)).toBe(0);
    expect(zoneRatio(MAX_SETPOINT_CELSIUS + 20)).toBe(1);
  });
});
