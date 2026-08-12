import type { BleManager } from "react-native-ble-plx";
import { describe, expect, it } from "vitest";
import type { DeviceHandle } from "@/domain/ports/DeviceHandle";
import { BleConnections } from "@/infrastructure/ble/BleConnections";
import { Bluetooth } from "@/infrastructure/ble/Bluetooth";

class FakeDevice {
  mtu: number | null = null;
  isDiscovered = false;
  isCancelled = false;
  private listeners: (() => void)[] = [];

  constructor(
    readonly id: string,
    readonly name: string | null,
  ) {}

  async requestMTU(mtu: number) {
    this.mtu = mtu;
    return this;
  }

  async discoverAllServicesAndCharacteristics() {
    this.isDiscovered = true;
    return this;
  }

  onDisconnected(listener: () => void) {
    this.listeners.push(listener);
    return {
      remove: () => {
        this.listeners = this.listeners.filter((l) => l !== listener);
      },
    };
  }

  async cancelConnection() {
    this.isCancelled = true;
    this.dropConnection();
    return this;
  }

  dropConnection() {
    for (const listener of [...this.listeners]) listener();
  }
}

function bluetoothWith(...devices: FakeDevice[]) {
  const manager = {
    connectToDevice: async (id: string) => {
      const device = devices.find((d) => d.id === id);
      if (!device) throw new Error(`No such device: ${id}`);
      return device;
    },
  };
  const connections = new BleConnections();
  const bluetooth = new Bluetooth(
    manager as unknown as BleManager,
    connections,
  );
  return { bluetooth, connections };
}

const UNKNOWN_HANDLE: DeviceHandle = { id: "never-connected", name: "Ghost" };

describe("Bluetooth.connect", () => {
  it("returns a handle carrying the id and name of the device", async () => {
    const device = new FakeDevice("water-id", "Water Module");
    const { bluetooth } = bluetoothWith(device);

    const handle = await bluetooth.connect("water-id");

    expect(handle).toEqual({ id: "water-id", name: "Water Module" });
  });

  it("names a handle with an empty string when the device advertises none", async () => {
    const device = new FakeDevice("water-id", null);
    const { bluetooth } = bluetoothWith(device);

    const handle = await bluetooth.connect("water-id");

    expect(handle.name).toBe("");
  });

  it("negotiates the MTU and discovers the services before handing out the handle", async () => {
    const device = new FakeDevice("water-id", "Water Module");
    const { bluetooth } = bluetoothWith(device);

    await bluetooth.connect("water-id");

    expect(device.mtu).toBe(185);
    expect(device.isDiscovered).toBe(true);
  });

  it("registers the connection so a transport can resolve the handle", async () => {
    const device = new FakeDevice("water-id", "Water Module");
    const { bluetooth, connections } = bluetoothWith(device);

    const handle = await bluetooth.connect("water-id");

    expect(connections.find(handle)).toBe(device);
  });

  it("forgets the connection once the radio drops it", async () => {
    const device = new FakeDevice("water-id", "Water Module");
    const { bluetooth, connections } = bluetoothWith(device);
    const handle = await bluetooth.connect("water-id");

    device.dropConnection();

    expect(connections.find(handle)).toBeUndefined();
  });
});

describe("Bluetooth.disconnect", () => {
  it("closes the connection behind the handle", async () => {
    const device = new FakeDevice("water-id", "Water Module");
    const { bluetooth } = bluetoothWith(device);
    const handle = await bluetooth.connect("water-id");

    await bluetooth.disconnect(handle);

    expect(device.isCancelled).toBe(true);
  });

  it("forgets the connection", async () => {
    const device = new FakeDevice("water-id", "Water Module");
    const { bluetooth, connections } = bluetoothWith(device);
    const handle = await bluetooth.connect("water-id");

    await bluetooth.disconnect(handle);

    expect(connections.find(handle)).toBeUndefined();
  });

  it("does nothing for a handle it never issued", async () => {
    const { bluetooth } = bluetoothWith();

    await expect(bluetooth.disconnect(UNKNOWN_HANDLE)).resolves.toBeUndefined();
  });
});

describe("Bluetooth.onDisconnected", () => {
  it("calls the listener when the device goes away", async () => {
    const device = new FakeDevice("water-id", "Water Module");
    const { bluetooth } = bluetoothWith(device);
    const handle = await bluetooth.connect("water-id");
    let notified = false;

    bluetooth.onDisconnected(handle, () => {
      notified = true;
    });
    device.dropConnection();

    expect(notified).toBe(true);
  });

  it("stops notifying once unsubscribed", async () => {
    const device = new FakeDevice("water-id", "Water Module");
    const { bluetooth } = bluetoothWith(device);
    const handle = await bluetooth.connect("water-id");
    let notified = false;

    const unsubscribe = bluetooth.onDisconnected(handle, () => {
      notified = true;
    });
    unsubscribe();
    device.dropConnection();

    expect(notified).toBe(false);
  });

  it("hands back a no-op unsubscribe for a handle it never issued", () => {
    const { bluetooth } = bluetoothWith();

    const unsubscribe = bluetooth.onDisconnected(UNKNOWN_HANDLE, () => {});

    expect(() => unsubscribe()).not.toThrow();
  });
});
