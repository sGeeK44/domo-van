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
  private cancellationSettlers: (() => void)[] = [];
  private holdsCancellation = false;

  constructor(
    readonly id: string,
    readonly name: string | null,
  ) {}

  get disconnectListenerCount() {
    return this.listeners.length;
  }

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
    if (this.holdsCancellation) {
      await new Promise<void>((resolve) => {
        this.cancellationSettlers.push(resolve);
      });
    }
    return this;
  }

  holdCancellation() {
    this.holdsCancellation = true;
  }

  settleCancellation() {
    for (const settle of this.cancellationSettlers.splice(0)) settle();
  }

  dropConnection() {
    this.emitDisconnection()();
  }

  // The radio emits now, the callbacks land one bridge batch later.
  emitDisconnection(): () => void {
    const notified = [...this.listeners];
    return () => {
      for (const listener of notified) listener();
    };
  }
}

function bluetoothConnectingWith(
  connectToDevice: (id: string) => Promise<FakeDevice>,
) {
  const connections = new BleConnections();
  const bluetooth = new Bluetooth(
    { connectToDevice } as unknown as BleManager,
    connections,
  );
  return { bluetooth, connections };
}

function bluetoothWith(...devices: FakeDevice[]) {
  return bluetoothConnectingWith(async (id: string) => {
    const device = devices.find((d) => d.id === id);
    if (!device) throw new Error(`No such device: ${id}`);
    return device;
  });
}

function bluetoothHandingOut(...devices: FakeDevice[]) {
  const queue = [...devices];
  return bluetoothConnectingWith(async () => {
    const device = queue.shift();
    if (!device) throw new Error("No device left to hand out.");
    return device;
  });
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

describe("Bluetooth reconnection", () => {
  it("keeps the new connection when the disconnect of the previous one resolves afterwards", async () => {
    const dropped = new FakeDevice("water-id", "Water Module");
    const reconnected = new FakeDevice("water-id", "Water Module");
    const { bluetooth, connections } = bluetoothHandingOut(
      dropped,
      reconnected,
    );
    const staleHandle = await bluetooth.connect("water-id");
    dropped.holdCancellation();
    const pendingDisconnect = bluetooth.disconnect(staleHandle);

    const handle = await bluetooth.connect("water-id");
    dropped.settleCancellation();
    await pendingDisconnect;

    expect(connections.find(handle)).toBe(reconnected);
  });

  it("keeps the new connection when a disconnect event of the previous one lands late", async () => {
    const dropped = new FakeDevice("water-id", "Water Module");
    const reconnected = new FakeDevice("water-id", "Water Module");
    const { bluetooth, connections } = bluetoothHandingOut(
      dropped,
      reconnected,
    );
    await bluetooth.connect("water-id");
    const deliverStaleEvent = dropped.emitDisconnection();

    const handle = await bluetooth.connect("water-id");
    deliverStaleEvent();

    expect(connections.find(handle)).toBe(reconnected);
  });

  it("unsubscribes the previous device when the same id connects again", async () => {
    const dropped = new FakeDevice("water-id", "Water Module");
    const reconnected = new FakeDevice("water-id", "Water Module");
    const { bluetooth } = bluetoothHandingOut(dropped, reconnected);
    await bluetooth.connect("water-id");

    await bluetooth.connect("water-id");

    expect(dropped.disconnectListenerCount).toBe(0);
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
