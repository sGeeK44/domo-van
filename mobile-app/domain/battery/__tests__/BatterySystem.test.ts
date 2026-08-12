import { describe, expect, it } from "vitest";
import { Listener, Unsubscribe } from "@/core/observable";
import { BatterySystem } from "@/domain/battery/BatterySystem";
import type { BinaryTransport } from "@/domain/ports/BinaryTransport";
import {
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

class FakeBinaryTransport implements BinaryTransport {
  private listener: Listener<Uint8Array> | null = null;
  public sent: Uint8Array[] = [];

  listen(onBytes: Listener<Uint8Array>): Unsubscribe {
    this.listener = onBytes;
    return () => {
      this.listener = null;
    };
  }

  send(bytes: Uint8Array): Promise<void> {
    this.sent.push(bytes);
    return Promise.resolve();
  }

  /** Simulate a notification carrying raw BMS bytes. */
  emit(bytes: number[]) {
    this.listener?.(new Uint8Array(bytes));
  }
}

describe("BatterySystem", () => {
  it("publishes the telemetry of a good frame", () => {
    const transport = new FakeBinaryTransport();
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

  it("keeps the previous snapshot when a malformed frame arrives", () => {
    const transport = new FakeBinaryTransport();
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
    const transport = new FakeBinaryTransport();
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
    const transport = new FakeBinaryTransport();
    const system = new BatterySystem(transport);
    transport.emit(frame([...NO_CURRENT, ...CHARGE_MOSFET_ON]));
    expect(system.getValue().isCharging).toBe(true);

    transport.emit(frame([0x85, 0x32]));

    expect(system.getValue().isCharging).toBe(true);
    system.dispose();
  });

  it("keeps the discharge MOSFET state when a later frame omits it", () => {
    const transport = new FakeBinaryTransport();
    const system = new BatterySystem(transport);
    transport.emit(frame([...NO_CURRENT, ...DISCHARGE_MOSFET_ON]));
    expect(system.getValue().isDischarging).toBe(true);

    transport.emit(frame([0x85, 0x32]));

    expect(system.getValue().isDischarging).toBe(true);
    system.dispose();
  });

  it("clears the charge flag when a frame reports the charge MOSFET open", () => {
    const transport = new FakeBinaryTransport();
    const system = new BatterySystem(transport);
    transport.emit(frame([...NO_CURRENT, ...CHARGE_MOSFET_ON]));
    expect(system.getValue().isCharging).toBe(true);

    transport.emit(frame([...CHARGE_MOSFET_OFF]));

    expect(system.getValue().isCharging).toBe(false);
    system.dispose();
  });

  it("stops reporting a charge once the current falls back to zero", () => {
    const transport = new FakeBinaryTransport();
    const system = new BatterySystem(transport);
    transport.emit(frame([...CURRENT]));
    expect(system.getValue().isCharging).toBe(true);

    transport.emit(frame([...NO_CURRENT]));

    expect(system.getValue().isCharging).toBe(false);
    system.dispose();
  });

  it("reports a discharge, and only that, once the current reverses", () => {
    const transport = new FakeBinaryTransport();
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
    const transport = new FakeBinaryTransport();
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

  it("recovers on the next good frame after a malformed one", () => {
    const transport = new FakeBinaryTransport();
    const system = new BatterySystem(transport);

    transport.emit(withBrokenChecksum(FRAME));
    transport.emit(FRAME);

    expect(system.getValue().percentage).toBe(98);
    system.dispose();
  });
});
