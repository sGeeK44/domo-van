import { afterEach, describe, expect, it, vi } from "vitest";
import { BatterySystem } from "@/domain/battery/BatterySystem";
import {
  buildCellInfoCommand,
  buildDeviceInfoCommand,
} from "@/domain/battery/JkBmsProtocol";
import { FakeBinaryTransport } from "@/infrastructure/fake/FakeBinaryTransport";
import { cellInfoFrame, FRAME, withBrokenChecksum } from "./JkBmsFrames";

/** No corpus: these tests drive every byte themselves. */
const SILENT = { frames: [] };

describe("BatterySystem", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("publishes the telemetry of a good frame", () => {
    const transport = new FakeBinaryTransport(SILENT);
    const system = new BatterySystem(transport);

    transport.emit(FRAME);

    const snapshot = system.getValue();
    expect(snapshot).toMatchObject({ percentage: 85, cellCount: 4 });
    expect(snapshot.voltage).toBeCloseTo(13.289, 3);
    expect(snapshot.current).toBeCloseTo(-6.137, 3);
    expect(snapshot.capacityAh).toBeCloseTo(560, 3);
    expect(snapshot.remainingAh).toBeCloseTo(475.055, 3);
    expect(snapshot.tempMos).toBeCloseTo(23.1, 1);
    system.dispose();
  });

  it("signs the power with the current, so a discharge reads negative", () => {
    const transport = new FakeBinaryTransport(SILENT);
    const system = new BatterySystem(transport);

    transport.emit(FRAME);

    expect(system.getValue().power).toBeCloseTo(-81.557, 3);
    system.dispose();
  });

  it("keeps a cell the BMS senses at 0 V in its own place", () => {
    const transport = new FakeBinaryTransport(SILENT);
    const system = new BatterySystem(transport);

    transport.emit(cellInfoFrame({ cellVoltagesMv: [3352, 0, 3361, 3338] }));

    const snapshot = system.getValue();
    expect(snapshot.cellVoltages).toEqual([3.352, 0, 3.361, 3.338]);
    expect(snapshot.cellCount).toBe(4);
    system.dispose();
  });

  it("spreads the pack over the cells it can still read", () => {
    const transport = new FakeBinaryTransport(SILENT);
    const system = new BatterySystem(transport);

    transport.emit(cellInfoFrame({ cellVoltagesMv: [3352, 0, 3361, 3338] }));

    const snapshot = system.getValue();
    expect(snapshot.minCellVoltage).toBeCloseTo(3.338, 3);
    expect(snapshot.maxCellVoltage).toBeCloseTo(3.361, 3);
    expect(snapshot.cellDelta).toBeCloseTo(0.023, 3);
    system.dispose();
  });

  it("keeps the previous snapshot when a corrupted frame arrives", () => {
    const transport = new FakeBinaryTransport(SILENT);
    const system = new BatterySystem(transport);
    transport.emit(FRAME);
    const good = system.getValue();
    let updates = 0;
    system.subscribe(() => {
      updates++;
    });

    transport.emit(withBrokenChecksum(FRAME));

    expect(updates).toBe(0);
    expect(system.getValue()).toEqual(good);
    system.dispose();
  });

  it("recovers on the next good frame after a corrupted one", () => {
    const transport = new FakeBinaryTransport(SILENT);
    const system = new BatterySystem(transport);

    transport.emit(withBrokenChecksum(FRAME));
    transport.emit(FRAME);

    expect(system.getValue().percentage).toBe(85);
    system.dispose();
  });

  it("reports a discharge, and only that, while the current flows out", () => {
    const transport = new FakeBinaryTransport(SILENT);
    const system = new BatterySystem(transport);

    transport.emit(FRAME);

    expect(system.getValue()).toMatchObject({
      isCharging: false,
      isDischarging: true,
    });
    system.dispose();
  });

  it("reports a charge, and only that, once the current reverses", () => {
    const transport = new FakeBinaryTransport(SILENT);
    const system = new BatterySystem(transport);

    transport.emit(cellInfoFrame({ currentMa: 6137, powerMw: 81557 }));

    expect(system.getValue()).toMatchObject({
      isCharging: true,
      isDischarging: false,
    });
    system.dispose();
  });

  it("reports neither at rest, whatever the MOSFETs allow", () => {
    const transport = new FakeBinaryTransport(SILENT);
    const system = new BatterySystem(transport);

    transport.emit(cellInfoFrame({ currentMa: 0, powerMw: 0 }));

    expect(system.getValue()).toMatchObject({
      isCharging: false,
      isDischarging: false,
    });
    system.dispose();
  });

  it("wakes the stream, then requests the cell info after the settle delay", async () => {
    vi.useFakeTimers();
    const transport = new FakeBinaryTransport(SILENT);
    const system = new BatterySystem(transport);

    expect(transport.sent).toEqual([buildDeviceInfoCommand()]);

    await vi.advanceTimersByTimeAsync(500);

    expect(transport.sent).toEqual([
      buildDeviceInfoCommand(),
      buildCellInfoCommand(),
    ]);
    system.dispose();
  });

  it("re-issues the wake-up sequence the constructor sent on resync", async () => {
    vi.useFakeTimers();
    const transport = new FakeBinaryTransport(SILENT);
    const system = new BatterySystem(transport);
    await vi.advanceTimersByTimeAsync(500);

    system.resync();
    await vi.advanceTimersByTimeAsync(500);

    expect(transport.sent).toEqual([
      buildDeviceInfoCommand(),
      buildCellInfoCommand(),
      buildDeviceInfoCommand(),
      buildCellInfoCommand(),
    ]);
    system.dispose();
  });

  it("drops the half frame a lost session left behind on resync", () => {
    const transport = new FakeBinaryTransport(SILENT);
    const system = new BatterySystem(transport);
    transport.emit(FRAME.slice(0, 150));

    system.resync();
    transport.emit(cellInfoFrame({ soc: 50 }));

    expect(system.getValue().percentage).toBe(50);
    system.dispose();
  });
});
