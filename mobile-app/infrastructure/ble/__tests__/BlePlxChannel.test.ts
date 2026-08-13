import { encode as base64Encode } from "base-64";
import type { Characteristic, Device } from "react-native-ble-plx";
import { describe, expect, it } from "vitest";
import { BlePlxChannel } from "@/infrastructure/ble/BlePlxChannel";

type Notify = (
  error: null,
  characteristic: Pick<Characteristic, "value"> | null,
) => void;

const WATER_SERVICE = "0001";
const TANK_CHANNEL = "0002";

/** Models ble-plx: one subscription per call, each getting every notification. */
class FakeDevice {
  private monitors: Notify[] = [];

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

  notify(text: string): void {
    const value = base64Encode(text);
    for (const monitor of [...this.monitors]) {
      monitor(null, { value } as Characteristic);
    }
  }
}

function channelOn(device: FakeDevice) {
  return new BlePlxChannel(
    device as unknown as Device,
    WATER_SERVICE,
    TANK_CHANNEL,
  );
}

function collect(channel: BlePlxChannel) {
  const messages: string[] = [];
  const stop = channel.listen((message) => messages.push(message));
  return { messages, stop };
}

describe("BlePlxChannel", () => {
  it("delivers a message to every listener, not just the last one", () => {
    const device = new FakeDevice();
    const channel = channelOn(device);
    const first = collect(channel);
    const second = collect(channel);

    device.notify("LVL:42\n");

    expect(first.messages).toEqual(["LVL:42"]);
    expect(second.messages).toEqual(["LVL:42"]);
  });

  it("monitors the characteristic once however many listeners subscribe", () => {
    const device = new FakeDevice();
    const channel = channelOn(device);

    collect(channel);
    collect(channel);

    expect(device.monitorCount).toBe(1);
  });

  it("keeps the monitor alive for the listeners that remain", () => {
    const device = new FakeDevice();
    const channel = channelOn(device);
    const first = collect(channel);
    const second = collect(channel);

    first.stop();
    device.notify("LVL:7\n");

    expect(device.monitorCount).toBe(1);
    expect(second.messages).toEqual(["LVL:7"]);
    expect(first.messages).toHaveLength(0);
  });

  it("removes the monitor once the last listener leaves", () => {
    const device = new FakeDevice();
    const channel = channelOn(device);
    const first = collect(channel);
    const second = collect(channel);

    first.stop();
    second.stop();

    expect(device.monitorCount).toBe(0);
  });

  it("reassembles a message split across notifications", () => {
    const device = new FakeDevice();
    const channel = channelOn(device);
    const { messages } = collect(channel);

    device.notify("LVL:");
    device.notify("42\nLVL:43\n");

    expect(messages).toEqual(["LVL:42", "LVL:43"]);
  });

  it("drops the half-received message when the last listener leaves", () => {
    const device = new FakeDevice();
    const channel = channelOn(device);
    const first = collect(channel);
    device.notify("LVL:");

    first.stop();
    const second = collect(channel);
    device.notify("42\n");

    expect(second.messages).toEqual(["42"]);
  });
});
