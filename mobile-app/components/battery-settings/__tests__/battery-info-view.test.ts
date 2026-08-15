import { describe, expect, it } from "vitest";
import { batteryInfoCards } from "@/components/battery-settings/battery-info-view";
import {
  type BatterySnapshot,
  DEFAULT_BATTERY_SNAPSHOT,
} from "@/domain/battery/BatteryTelemetry";

function cardsOf(overrides: Partial<BatterySnapshot>) {
  return batteryInfoCards({ ...DEFAULT_BATTERY_SNAPSHOT, ...overrides });
}

function readouts(overrides: Partial<BatterySnapshot>) {
  return cardsOf(overrides).flatMap((card) => card.readouts);
}

function valueOf(overrides: Partial<BatterySnapshot>, labelKey: string) {
  const readout = readouts(overrides).find(
    (candidate) => candidate.labelKey === labelKey,
  );
  return `${readout?.value ?? ""}${readout?.unit ?? ""}`;
}

describe("the battery information cards", () => {
  it("groups the BMS reading into the mockup's four cards", () => {
    expect(cardsOf({}).map((card) => card.labelKey)).toEqual([
      "battery.info.charge",
      "battery.info.capacity",
      "battery.info.cells",
      "battery.info.temperatures",
    ]);
  });

  it("reads three values per card, twelve in all", () => {
    expect(cardsOf({}).map((card) => card.readouts.length)).toEqual([
      3, 3, 3, 3,
    ]);
  });

  it("states the pack at the precision the BMS reports it", () => {
    const pack = { percentage: 82.4, voltage: 13.204, current: -6.6 };

    expect(valueOf(pack, "battery.info.state")).toBe("82%");
    expect(valueOf(pack, "battery.info.voltage")).toBe("13.20V");
    expect(valueOf(pack, "battery.info.current")).toBe("-6.60A");
  });

  it("states the capacity in Ah and counts the cycles bare", () => {
    const capacity = { remainingAh: 164.25, capacityAh: 200, cycleCount: 143 };

    expect(valueOf(capacity, "battery.info.remaining")).toBe("164.3Ah");
    expect(valueOf(capacity, "battery.info.nominal")).toBe("200.0Ah");
    expect(valueOf(capacity, "battery.info.cycles")).toBe("143");
  });

  // The pack talks in volts; the spread is only readable in millivolts.
  it("states the cells in volts and their spread in millivolts", () => {
    const cells = {
      maxCellVoltage: 3.361,
      minCellVoltage: 3.338,
      cellDelta: 0.023,
    };

    expect(valueOf(cells, "battery.info.maxCell")).toBe("3.361V");
    expect(valueOf(cells, "battery.info.minCell")).toBe("3.338V");
    expect(valueOf(cells, "battery.info.delta")).toBe("23mV");
  });

  it("states the three probes in degrees", () => {
    const temperatures = { tempMos: 28.44, tempCell1: 21.9, tempCell2: 22.3 };

    expect(valueOf(temperatures, "battery.info.mosfet")).toBe("28.4°C");
    expect(valueOf(temperatures, "battery.info.probe1")).toBe("21.9°C");
    expect(valueOf(temperatures, "battery.info.probe2")).toBe("22.3°C");
  });

  it("names every label with a key, so the form carries no copy", () => {
    const labels = [
      ...cardsOf({}).map((card) => card.labelKey),
      ...readouts({}).map((readout) => readout.labelKey),
    ];

    expect(labels.every((key) => key.startsWith("battery.info."))).toBe(true);
  });
});
