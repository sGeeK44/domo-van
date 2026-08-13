import { describe, expect, it } from "vitest";
import { ModuleSystemSessions } from "@/composition/ModuleSessions";
import type { Listener, Unsubscribe } from "@/core/observable";
import { BatterySystem } from "@/domain/battery/BatterySystem";
import {
  BATTERY_MODULE,
  HEATER_MODULE,
  WATER_MODULE,
} from "@/domain/modules/ModuleDescriptor";
import { ModuleRegistry } from "@/domain/modules/ModuleRegistry";
import type { BinaryTransport } from "@/domain/ports/BinaryTransport";
import type { Channel } from "@/domain/ports/Channel";
import type { DeviceHandle } from "@/domain/ports/DeviceHandle";
import type { ModuleTransport } from "@/domain/ports/ModuleTransport";
import type { TransportFactory } from "@/domain/ports/TransportFactory";
import { WaterSystem } from "@/domain/water/WaterSystem";
import { UnknownDeviceError } from "@/infrastructure/ble/BleConnections";
import {
  FakeBluetooth,
  fakePairedDevices,
} from "@/infrastructure/fake/FakeBluetooth";
import { InMemoryDeviceRepository } from "@/infrastructure/fake/InMemoryDeviceRepository";
import { TransportDisposedError } from "@/infrastructure/session/TransportDisposedError";

const WATER_DEVICE: DeviceHandle = { id: "water-1", name: "Water Module" };
const BATTERY_DEVICE: DeviceHandle = { id: "battery-1", name: "JK BMS" };

class StubChannel implements Channel {
  listen(_listener: Listener<string>): Unsubscribe {
    return () => {};
  }

  async send(_command: string): Promise<void> {}
}

class StubTransportFactory implements TransportFactory {
  readonly moduleOpens: string[] = [];
  readonly binaryOpens: string[] = [];

  moduleTransport(device: DeviceHandle, serviceId: string): ModuleTransport {
    this.moduleOpens.push(`${device.id}/${serviceId}`);
    return { openChannel: () => new StubChannel() };
  }

  binaryTransport(device: DeviceHandle): BinaryTransport {
    this.binaryOpens.push(device.id);
    return { listen: () => () => {}, send: async () => {} };
  }
}

/** Reproduces an adapter whose device was evicted between the connect and the bind. */
class EvictingTransportFactory implements TransportFactory {
  private serving = false;

  serveAgain(): void {
    this.serving = true;
  }

  moduleTransport(device: DeviceHandle, _serviceId: string): ModuleTransport {
    this.requireServing(device);
    return { openChannel: () => new StubChannel() };
  }

  binaryTransport(device: DeviceHandle): BinaryTransport {
    this.requireServing(device);
    return { listen: () => () => {}, send: async () => {} };
  }

  private requireServing(device: DeviceHandle): void {
    if (!this.serving) throw new UnknownDeviceError(device.id);
  }
}

function setup() {
  const transports = new StubTransportFactory();
  return { transports, sessions: new ModuleSystemSessions(transports) };
}

describe("the sessions behind the module systems", () => {
  it("tolerates an unbind arriving twice in a row", () => {
    const { transports, sessions } = setup();
    sessions.open(WATER_MODULE);
    sessions.bind(WATER_MODULE, WATER_DEVICE);
    const water = sessions.systems.getValue().water;

    sessions.unbind(WATER_MODULE);
    sessions.unbind(WATER_MODULE);
    sessions.bind(WATER_MODULE, WATER_DEVICE);

    expect(transports.moduleOpens).toHaveLength(2);
    expect(sessions.systems.getValue().water).toBe(water);
  });

  it("tolerates an unbind with no bind before it", () => {
    const { transports, sessions } = setup();
    sessions.open(WATER_MODULE);

    sessions.unbind(WATER_MODULE);
    sessions.unbind(HEATER_MODULE);
    sessions.bind(WATER_MODULE, WATER_DEVICE);

    expect(transports.moduleOpens).toEqual(["water-1/0001"]);
  });

  it("tolerates a close with no open before it", () => {
    const { transports, sessions } = setup();

    sessions.close(WATER_MODULE);

    expect(sessions.systems.getValue().water).toBeNull();
    sessions.open(WATER_MODULE);
    sessions.bind(WATER_MODULE, WATER_DEVICE);
    expect(transports.moduleOpens).toEqual(["water-1/0001"]);
  });

  it("gives the next pairing a system of its own", async () => {
    const { transports, sessions } = setup();
    sessions.open(WATER_MODULE);
    const first = sessions.systems.getValue().water;

    sessions.close(WATER_MODULE);
    expect(sessions.systems.getValue().water).toBeNull();

    sessions.open(WATER_MODULE);
    const second = sessions.systems.getValue().water;
    sessions.bind(WATER_MODULE, WATER_DEVICE);

    expect(second).toBeInstanceOf(WaterSystem);
    expect(second).not.toBe(first);
    expect(transports.moduleOpens).toEqual(["water-1/0001"]);
    await expect(first?.cleanTank.getConfig()).rejects.toBeInstanceOf(
      TransportDisposedError,
    );
  });

  it("keeps one battery system across its binary sessions", () => {
    const { transports, sessions } = setup();

    sessions.open(BATTERY_MODULE);
    expect(sessions.systems.getValue().battery).toBeInstanceOf(BatterySystem);
    expect(transports.binaryOpens).toEqual([]);

    sessions.bind(BATTERY_MODULE, BATTERY_DEVICE);
    const battery = sessions.systems.getValue().battery;
    sessions.unbind(BATTERY_MODULE);
    sessions.bind(BATTERY_MODULE, BATTERY_DEVICE);

    expect(transports.binaryOpens).toEqual(["battery-1", "battery-1"]);
    expect(sessions.systems.getValue().battery).toBe(battery);
  });
});

function evictingRegistry() {
  const transports = new EvictingTransportFactory();
  const repository = new InMemoryDeviceRepository(fakePairedDevices());
  const registry = new ModuleRegistry({
    repository,
    connector: new FakeBluetooth(),
    sessions: new ModuleSystemSessions(transports),
  });

  return { transports, registry };
}

describe("a device the transport factory refuses to serve", () => {
  it("leaves the slot offline instead of stuck connecting", async () => {
    const { registry } = evictingRegistry();

    await registry.start();

    expect(registry.slotOf("water").link.status).toBe("offline");
    expect(registry.slotOf("water").pairing?.id).toBe("fake-water");
  });

  it("still reconnects once the factory serves the device again", async () => {
    const { transports, registry } = evictingRegistry();
    await registry.start();

    transports.serveAgain();
    await registry.reconnect("water");

    expect(registry.slotOf("water").link.status).toBe("online");
  });
});
