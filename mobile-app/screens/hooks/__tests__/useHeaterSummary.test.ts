import { describe, expect, it } from "vitest";
import type { HeaterZoneSnapshot } from "@/domain/heater/HeaterZone";
import { heaterSummary } from "@/screens/hooks/useHeaterSummary";

function zone(isRunning: boolean, setpointCelsius: number): HeaterZoneSnapshot {
  return {
    temperatureCelsius: 18,
    setpointCelsius,
    isRunning,
    pidConfig: null,
    lastMessage: null,
  };
}

describe("what the dashboard says about the heater", () => {
  it("is idle while no zone runs", () => {
    expect(heaterSummary([zone(false, 21), zone(false, 19)])).toEqual({
      isRunning: false,
      setpointCelsius: 0,
    });
  });

  it("heats up to the warmest setpoint a running zone asks for", () => {
    const zones = [zone(true, 19), zone(false, 24), zone(true, 21)];

    expect(heaterSummary(zones)).toEqual({
      isRunning: true,
      setpointCelsius: 21,
    });
  });
});
