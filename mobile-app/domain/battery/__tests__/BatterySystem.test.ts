import { describe, expect, it } from "vitest";
import { BatterySystem } from "@/domain/battery/BatterySystem";
import { buildReadAllCommand } from "@/domain/battery/JkBmsProtocol";
import { FakeBinaryTransport } from "@/infrastructure/fake/FakeBinaryTransport";
import {
  BROKEN_SENSE_WIRE,
  CHARGE_MOSFET_OFF,
  CHARGE_MOSFET_ON,
  CURRENT,
  DISCHARGE_CURRENT,
  DISCHARGE_MOSFET_ON,
  FRAME,
  frame,
  NO_CURRENT,
  PAYLOAD,
  withBogusLength,
  withBrokenChecksum,
} from "./JkBmsFrames";

/** No corpus: these tests drive every byte themselves. */
const SILENT = { frames: [] };

describe("BatterySystem", () => {
  it("publishes the telemetry of a good frame", () => {
    const transport = new FakeBinaryTransport(SILENT);
    const system = new BatterySystem(transport);

    transport.emit(FRAME);

    expect(system.getValue()).toMatchObject({
      percentage: 98,
      cellCount: 4,
      tempMos: 4,
    });
    expect(system.getValue().voltage).toBeCloseTo(13.2, 2);
    system.dispose();
  });

  it("keeps a cell the BMS senses at 0 V in its own place", () => {
    const transport = new FakeBinaryTransport(SILENT);
    const system = new BatterySystem(transport);

    transport.emit(frame([...BROKEN_SENSE_WIRE]));

    const snapshot = system.getValue();
    expect(snapshot.cellVoltages).toEqual([3.352, 0, 3.361, 3.338]);
    expect(snapshot.cellCount).toBe(4);
    system.dispose();
  });

  it("spreads the pack over the cells it can still read", () => {
    const transport = new FakeBinaryTransport(SILENT);
    const system = new BatterySystem(transport);

    transport.emit(frame([...BROKEN_SENSE_WIRE]));

    const snapshot = system.getValue();
    expect(snapshot.minCellVoltage).toBeCloseTo(3.338, 3);
    expect(snapshot.maxCellVoltage).toBeCloseTo(3.361, 3);
    expect(snapshot.cellDelta).toBeCloseTo(0.023, 3);
    system.dispose();
  });

  it("keeps the previous snapshot when a malformed frame arrives", () => {
    const transport = new FakeBinaryTransport(SILENT);
    const system = new BatterySystem(transport);
    transport.emit(FRAME);
    const good = system.getValue();
    let updates = 0;
    system.subscribe(() => {
      updates++;
    });

    transport.emit(withBrokenChecksum(FRAME));
    transport.emit(withBogusLength(FRAME));
    transport.emit(frame(PAYLOAD.slice(0, -1)));
    transport.emit([0x4e, 0x57, 0x00]);

    expect(updates).toBe(0);
    expect(system.getValue()).toEqual(good);
    system.dispose();
  });

  it("keeps the fields a frame does not carry", () => {
    const transport = new FakeBinaryTransport(SILENT);
    const system = new BatterySystem(transport);
    transport.emit(FRAME);

    transport.emit(frame([0x85, 0x32]));

    const snapshot = system.getValue();
    expect(snapshot.percentage).toBe(50);
    expect(snapshot.voltage).toBeCloseTo(13.2, 2);
    expect(snapshot.cellVoltages).toHaveLength(4);
    system.dispose();
  });

  it("keeps the charge MOSFET state when a later frame omits it", () => {
    const transport = new FakeBinaryTransport(SILENT);
    const system = new BatterySystem(transport);
    transport.emit(frame([...NO_CURRENT, ...CHARGE_MOSFET_ON]));
    expect(system.getValue().isCharging).toBe(true);

    transport.emit(frame([0x85, 0x32]));

    expect(system.getValue().isCharging).toBe(true);
    system.dispose();
  });

  it("keeps the discharge MOSFET state when a later frame omits it", () => {
    const transport = new FakeBinaryTransport(SILENT);
    const system = new BatterySystem(transport);
    transport.emit(frame([...NO_CURRENT, ...DISCHARGE_MOSFET_ON]));
    expect(system.getValue().isDischarging).toBe(true);

    transport.emit(frame([0x85, 0x32]));

    expect(system.getValue().isDischarging).toBe(true);
    system.dispose();
  });

  it("clears the charge flag when a frame reports the charge MOSFET open", () => {
    const transport = new FakeBinaryTransport(SILENT);
    const system = new BatterySystem(transport);
    transport.emit(frame([...NO_CURRENT, ...CHARGE_MOSFET_ON]));
    expect(system.getValue().isCharging).toBe(true);

    transport.emit(frame([...CHARGE_MOSFET_OFF]));

    expect(system.getValue().isCharging).toBe(false);
    system.dispose();
  });

  it("stops reporting a charge once the current falls back to zero", () => {
    const transport = new FakeBinaryTransport(SILENT);
    const system = new BatterySystem(transport);
    transport.emit(frame([...CURRENT]));
    expect(system.getValue().isCharging).toBe(true);

    transport.emit(frame([...NO_CURRENT]));

    expect(system.getValue().isCharging).toBe(false);
    system.dispose();
  });

  it("reports a discharge, and only that, once the current reverses", () => {
    const transport = new FakeBinaryTransport(SILENT);
    const system = new BatterySystem(transport);
    transport.emit(frame([...CURRENT]));

    transport.emit(frame([...DISCHARGE_CURRENT]));

    expect(system.getValue()).toMatchObject({
      isCharging: false,
      isDischarging: true,
    });
    system.dispose();
  });

  it("never reports charging and discharging at once when frames carry only the current", () => {
    const transport = new FakeBinaryTransport(SILENT);
    const system = new BatterySystem(transport);
    const sequence = [
      [CURRENT, { isCharging: true, isDischarging: false }],
      [NO_CURRENT, { isCharging: false, isDischarging: false }],
      [DISCHARGE_CURRENT, { isCharging: false, isDischarging: true }],
      [CURRENT, { isCharging: true, isDischarging: false }],
      [DISCHARGE_CURRENT, { isCharging: false, isDischarging: true }],
    ] as const;

    for (const [payload, expected] of sequence) {
      transport.emit(frame([...payload]));

      const snapshot = system.getValue();
      expect(snapshot).toMatchObject(expected);
      expect(snapshot.isCharging && snapshot.isDischarging).toBe(false);
    }
    system.dispose();
  });

  it("re-issues the read-all the constructor sent on resync", () => {
    const transport = new FakeBinaryTransport(SILENT);
    const system = new BatterySystem(transport);

    system.resync();

    expect(transport.sent).toEqual([
      buildReadAllCommand(),
      buildReadAllCommand(),
    ]);
    system.dispose();
  });

  it("recovers on the next good frame after a malformed one", () => {
    const transport = new FakeBinaryTransport(SILENT);
    const system = new BatterySystem(transport);

    transport.emit(withBrokenChecksum(FRAME));
    transport.emit(FRAME);

    expect(system.getValue().percentage).toBe(98);
    system.dispose();
  });
});
