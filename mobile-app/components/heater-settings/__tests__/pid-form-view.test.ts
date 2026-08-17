import { describe, expect, it } from "vitest";
import {
  gainKey,
  type PidFormValues,
  pidValuesFrom,
  pidZoneName,
  validatePidValues,
  ZONE_INDEXES,
  zoneGainsFrom,
} from "@/components/heater-settings/pid-form-view";
import {
  DEFAULT_ZONE_SNAPSHOT,
  type HeaterZoneSnapshot,
} from "@/domain/heater/HeaterZone";

const TUNED = { kp: 10, ki: 0.1, kd: 0.5 };

function zoneAt(gains: HeaterZoneSnapshot["pidConfig"]): HeaterZoneSnapshot {
  return { ...DEFAULT_ZONE_SNAPSHOT, pidConfig: gains };
}

function valuesOf(overrides: Partial<PidFormValues> = {}): PidFormValues {
  return {
    ...pidValuesFrom(ZONE_INDEXES.map(() => zoneAt(TUNED))),
    ...overrides,
  };
}

describe("pidValuesFrom", () => {
  it("shows the module's gains at the precision the wire can carry", () => {
    const values = pidValuesFrom(ZONE_INDEXES.map(() => zoneAt(TUNED)));

    expect(values[gainKey(0, "kp")]).toBe("10.00");
    expect(values[gainKey(0, "ki")]).toBe("0.10");
    expect(values[gainKey(0, "kd")]).toBe("0.50");
  });

  it("shows nothing for a zone that has not answered yet", () => {
    const values = pidValuesFrom(ZONE_INDEXES.map(() => zoneAt(null)));

    expect(values[gainKey(2, "kp")]).toBe("");
  });
});

describe("validatePidValues", () => {
  it("accepts every gain the firmware stores", () => {
    expect(validatePidValues(valuesOf())).toEqual({});
  });

  it.each([
    "0",
    "0.009",
    "100.01",
    "-1",
    "",
    "abc",
  ])("refuses %s, which the module would reject or misread", (typed) => {
    const errors = validatePidValues(valuesOf({ [gainKey(1, "ki")]: typed }));

    expect(errors[gainKey(1, "ki")]).toBe("heater.pid.invalidGain");
  });

  it("marks only the field at fault", () => {
    const errors = validatePidValues(valuesOf({ [gainKey(3, "kd")]: "999" }));

    expect(Object.keys(errors)).toEqual([gainKey(3, "kd")]);
  });
});

describe("zoneGainsFrom", () => {
  it("quantizes a gain to what the wire carries, so the field cannot disagree with the module", () => {
    // HeaterZone sends round(gain x 100); unquantized, 0.015 would be stored 0.02 and shown 0.01.
    const gains = zoneGainsFrom(valuesOf({ [gainKey(0, "ki")]: "0.015" }));

    expect(gains[0].ki).toBe(0.02);
    expect(pidValuesFrom([{ ...zoneAt(gains[0]) }])[gainKey(0, "ki")]).toBe(
      "0.02",
    );
  });

  it("hands the domain one set of gains per zone, in zone order", () => {
    const gains = zoneGainsFrom(valuesOf({ [gainKey(2, "kp")]: "12.34" }));

    expect(gains).toHaveLength(4);
    expect(gains[2]).toEqual({ kp: 12.34, ki: 0.1, kd: 0.5 });
    expect(gains[0]).toEqual(TUNED);
  });
});

describe("pidZoneName", () => {
  it("names a failing zone from the key the piloting screen reads", () => {
    const refused = {
      field: "heater.pid.zone3",
      outcome: { status: "rejected", code: "ERR_CFG_RANGE" },
    } as const;

    expect(pidZoneName(refused)).toBe("heater.zones.zone3");
  });
});
