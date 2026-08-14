import { describe, expect, it } from "vitest";
import type { HeaterZoneSnapshot } from "@/domain/heater/HeaterZone";
import { heaterSummary } from "@/screens/hooks/useHeaterSummary";

function zone(isRunning: boolean, setpointCelsius: number): HeaterZoneSnapshot {
  return {
    temperatureCelsius: 18,
    setpointCelsius,
    isRunning,
    pidConfig: null,
    lastFeedback: null,
  };
}

describe("what the dashboard says about the heater", () => {
  it("is idle while no zone runs", () => {
    expect(heaterSummary([zone(false, 21), zone(false, 19)]).isRunning).toBe(
      false,
    );
  });

  it("heats as soon as one zone does, whichever it is", () => {
    expect(heaterSummary([zone(false, 19), zone(true, 24)]).isRunning).toBe(
      true,
    );
  });

  it("quotes the first zone, whatever the others report", () => {
    const summary = heaterSummary([zone(false, 21), zone(true, 24)]);

    expect(summary.referenceIndex).toBe(0);
    expect(summary.reference.setpointCelsius).toBe(21);
  });

  it("reads a heater that answered nothing as a stopped one", () => {
    const summary = heaterSummary([]);

    expect(summary.isRunning).toBe(false);
    expect(summary.reference.isRunning).toBe(false);
  });
});
