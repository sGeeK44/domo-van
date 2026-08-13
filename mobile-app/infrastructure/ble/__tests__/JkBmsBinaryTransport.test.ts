import { decode as base64Decode, encode as base64Encode } from "base-64";
import type { Characteristic, Device } from "react-native-ble-plx";
import { describe, expect, it } from "vitest";
import { JkBmsBinaryTransport } from "@/infrastructure/ble/JkBmsBinaryTransport";

type Notify = (
  error: null,
  characteristic: Pick<Characteristic, "value"> | null,
) => void;

/** Models ble-plx: one subscription per call, each getting every notification. */
class FakeDevice {
  private monitors: Notify[] = [];
  readonly writes: string[] = [];

  get monitorCount(): number {
    return this.monitors.length;
  }

  monitorCharacteristicForService(
    _serviceUuid: string,
    _characteristicUuid: string,
    onNotification: Notify,
  ) {
    const registration: Notify = (error, characteristic) =>
      onNotification(error, characteristic);
    this.monitors.push(registration);
    return {
      remove: () => {
        this.monitors = this.monitors.filter((m) => m !== registration);
      },
    };
  }

  async writeCharacteristicWithoutResponseForService(
    _serviceUuid: string,
    _characteristicUuid: string,
    payload: string,
  ) {
    this.writes.push(payload);
    return this;
  }

  notify(bytes: ArrayLike<number>): void {
    const value = base64Encode(toBinaryString(bytes));
    for (const monitor of [...this.monitors]) {
      monitor(null, { value } as Characteristic);
    }
  }
}

/** Per-byte, because spreading a large frame onto the argument stack overflows it. */
function toBinaryString(bytes: ArrayLike<number>): string {
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return binary;
}

function transportOn(device: FakeDevice) {
  return new JkBmsBinaryTransport(device as unknown as Device);
}

function collect(transport: JkBmsBinaryTransport) {
  const chunks: Uint8Array[] = [];
  const stop = transport.listen((bytes) => chunks.push(bytes));
  return { chunks, stop };
}

describe("JkBmsBinaryTransport", () => {
  it("delivers a notification to every listener, not just the last one", () => {
    const device = new FakeDevice();
    const transport = transportOn(device);
    const first = collect(transport);
    const second = collect(transport);

    device.notify([0x4e, 0x57]);

    expect(first.chunks).toEqual([new Uint8Array([0x4e, 0x57])]);
    expect(second.chunks).toEqual([new Uint8Array([0x4e, 0x57])]);
  });

  it("monitors the characteristic once however many listeners subscribe", () => {
    const device = new FakeDevice();
    const transport = transportOn(device);

    collect(transport);
    collect(transport);

    expect(device.monitorCount).toBe(1);
  });

  it("keeps the monitor alive for the listeners that remain", () => {
    const device = new FakeDevice();
    const transport = transportOn(device);
    const first = collect(transport);
    const second = collect(transport);

    first.stop();
    device.notify([0x01]);

    expect(device.monitorCount).toBe(1);
    expect(second.chunks).toEqual([new Uint8Array([0x01])]);
    expect(first.chunks).toHaveLength(0);
  });

  it("removes the monitor once the last listener leaves", () => {
    const device = new FakeDevice();
    const transport = transportOn(device);
    const first = collect(transport);
    const second = collect(transport);

    first.stop();
    second.stop();

    expect(device.monitorCount).toBe(0);
  });

  it("re-opens a monitor for a listener that arrives after the last one left", () => {
    const device = new FakeDevice();
    const transport = transportOn(device);
    collect(transport).stop();

    const { chunks } = collect(transport);
    device.notify([0x02]);

    expect(chunks).toEqual([new Uint8Array([0x02])]);
  });

  it("delivers a notification too large to spread onto the argument stack", () => {
    const device = new FakeDevice();
    const transport = transportOn(device);
    const { chunks } = collect(transport);

    device.notify(new Uint8Array(200_000).fill(0x41));

    expect(chunks[0]).toHaveLength(200_000);
  });

  it("writes a frame too large to spread onto the argument stack", async () => {
    const device = new FakeDevice();
    const transport = transportOn(device);
    const huge = new Uint8Array(200_000).fill(0x41);

    await transport.send(huge);

    expect(base64Decode(device.writes[0])).toHaveLength(huge.length);
  });
});
