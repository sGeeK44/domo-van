import { Channel } from "@/core/bluetooth/Channel";
import { Listener, Unsubscribe } from "@/core/observable";
import { DrainValve } from "@/domain/water/DrainValve";
import { TankLevelSensor } from "@/domain/water/TankLevelSensor";
import { describe, expect, it } from "vitest";

class FakeChannel implements Channel {
  private listener: Listener<string> | null = null;
  public commands: string[] = [];

  listen(listener: Listener<string>): Unsubscribe {
    this.listener = listener;
    return () => {
      this.listener = null;
    };
  }
  send(command: string): Promise<void> {
    this.commands.push(command);
    return Promise.resolve();
  }

  disconnect(): Promise<void> {
    throw new Error("Method not implemented.");
  }

  /** Simulate receiving a message on a channel */
  emit(msg: string) {
    if (!this.listener) return;
    this.listener(msg);
  }
}

describe("TankLevelSensor", () => {
  it("requests config on first subscribe and computes percentage", async () => {
    const ble = new FakeChannel();
    const sensor = new TankLevelSensor(ble);

    // Subscribe triggers lazy start.
    const unsub = sensor.subscribe(() => {});

    // writeCommand is async, executed on next microtask.
    await Promise.resolve();
    expect(ble.commands).toContain("CFG?");

    // Simulate firmware responses
    ble.emit("CFG:V=100 H=200");
    ble.emit("50");

    expect(sensor.getValue()).toMatchObject({
      capacityLiters: 100,
      heightMm: 200,
      percentage: 75,
      lastDistanceMm: 50,
    });

    unsub();
    sensor.dispose();
  });

  it("handles distance before config", () => {
    const ble = new FakeChannel();
    const sensor = new TankLevelSensor(ble);
    sensor.subscribe(() => {});

    ble.emit("20");
    expect(sensor.getValue()).toMatchObject({
      heightMm: 0,
      percentage: 0,
      lastDistanceMm: 20,
    });

    ble.emit("CFG:V=90 H=100");
    expect(sensor.getValue()).toMatchObject({
      capacityLiters: 90,
      heightMm: 100,
      percentage: 80,
      lastDistanceMm: 20,
    });

    sensor.dispose();
  });
});

describe("DrainValve", () => {
  it("sends commands and updates state optimistically", async () => {
    const ble = new FakeChannel();
    const valve = new DrainValve(ble);

    await valve.open();
    expect(ble.commands).toContainEqual("OPEN");
    expect(valve.getValue()).toEqual({ position: "open" });

    await valve.close();
    expect(ble.commands).toContainEqual("CLOSE");
    expect(valve.getValue()).toEqual({ position: "closed" });

    valve.dispose();
  });

  it("falls back to unknown on error", async () => {
    const failingBle: Channel = {
      listen: () => () => {},
      send: async () => {
        throw new Error("not connected");
      },
      disconnect: async () => {},
    };

    const valve = new DrainValve(failingBle);
    await valve.open();
    expect(valve.getValue()).toEqual({ position: "unknown" });
    valve.dispose();
  });
});
