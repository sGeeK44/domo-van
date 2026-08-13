import type { BleManager, Subscription } from "react-native-ble-plx";
import { describe, expect, it } from "vitest";
import type { DiscoveredBluetoothDevice } from "@/domain/ports/BluetoothScanner";
import type { DeviceHandle } from "@/domain/ports/DeviceHandle";
import { BleConnections } from "@/infrastructure/ble/BleConnections";
import { Bluetooth } from "@/infrastructure/ble/Bluetooth";

type DisconnectionRegistration = {
  deviceId: string;
  deliver: (disconnectedId: string) => void;
};

type Advertisement = {
  id: string;
  name: string | null;
  serviceUUIDs?: string[] | null;
};

type ScanRequest = {
  uuids: string[] | null;
  options: { allowDuplicates?: boolean } | null;
};

/** Models ble-plx: one manager-wide emitter, every listener filtered by id. */
class FakeRadio {
  private readonly registrations = new Set<DisconnectionRegistration>();
  private readonly connectedIds = new Set<string>();
  private readonly reachable = new Map<string, FakeDevice[]>();

  /** ble-plx builds a fresh `Device` per connection, never reusing one. */
  willConnect(deviceId: string, name: string | null): FakeDevice {
    const device = new FakeDevice(this, deviceId, name);
    const queue = this.reachable.get(deviceId) ?? [];
    queue.push(device);
    this.reachable.set(deviceId, queue);
    return device;
  }

  async connectToDevice(deviceId: string): Promise<FakeDevice> {
    const device = this.reachable.get(deviceId)?.shift();
    if (!device) throw new Error(`No such device: ${deviceId}`);

    this.connectedIds.add(deviceId);
    return device;
  }

  async isDeviceConnected(deviceId: string): Promise<boolean> {
    return this.connectedIds.has(deviceId);
  }

  scanRequest: ScanRequest | null = null;
  private scanListener:
    | ((error: Error | null, device: Advertisement | null) => void)
    | null = null;

  startDeviceScan(
    uuids: string[] | null,
    options: { allowDuplicates?: boolean } | null,
    listener: (error: Error | null, device: Advertisement | null) => void,
  ): void {
    this.scanRequest = { uuids, options };
    this.scanListener = listener;
  }

  stopDeviceScan(): void {
    this.scanListener = null;
  }

  broadcast(advertisement: Advertisement): void {
    this.scanListener?.(null, advertisement);
  }

  onDeviceDisconnected(deviceId: string, listener: () => void): Subscription {
    const registration = {
      deviceId,
      deliver: (disconnectedId: string) => {
        if (disconnectedId !== deviceId) return;
        listener();
      },
    };
    this.registrations.add(registration);
    return this.removableOnce(registration);
  }

  disconnectionListenersFor(deviceId: string): number {
    return [...this.registrations].filter((r) => r.deviceId === deviceId)
      .length;
  }

  cancelDeviceConnection(deviceId: string): void {
    this.dropConnection(deviceId);
  }

  /** The link is gone and the id with it. */
  dropConnection(deviceId: string): void {
    this.connectedIds.delete(deviceId);
    this.emitDisconnection(deviceId);
  }

  /** A replaced link tearing down: the id is connected through the new one. */
  staleTeardownEvent(deviceId: string): void {
    this.emitDisconnection(deviceId);
  }

  private emitDisconnection(deviceId: string): void {
    for (const registration of [...this.registrations]) {
      registration.deliver(deviceId);
    }
  }

  /** ble-plx wraps the subscription so a second `remove()` is a no-op. */
  private removableOnce(registration: DisconnectionRegistration): Subscription {
    let active = true;
    return {
      remove: () => {
        if (!active) return;

        active = false;
        this.registrations.delete(registration);
      },
    };
  }
}

class FakeDevice {
  mtu: number | null = null;
  isDiscovered = false;
  isCancelled = false;
  private readonly cancellationSettlers: (() => void)[] = [];
  private holdsCancellation = false;

  constructor(
    private readonly radio: FakeRadio,
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
    return this.radio.onDeviceDisconnected(this.id, listener);
  }

  isConnected() {
    return this.radio.isDeviceConnected(this.id);
  }

  async cancelConnection() {
    this.isCancelled = true;
    this.radio.cancelDeviceConnection(this.id);
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
}

function bluetoothOn(radio: FakeRadio) {
  const connections = new BleConnections();
  const bluetooth = new Bluetooth(radio as unknown as BleManager, connections);
  return { bluetooth, connections, radio };
}

function bluetoothReaching(deviceId: string, name: string | null) {
  const radio = new FakeRadio();
  const device = radio.willConnect(deviceId, name);
  return { ...bluetoothOn(radio), device };
}

function bluetoothReconnecting(deviceId: string, name: string | null) {
  const radio = new FakeRadio();
  const dropped = radio.willConnect(deviceId, name);
  const reconnected = radio.willConnect(deviceId, name);
  return { ...bluetoothOn(radio), dropped, reconnected };
}

/** Disconnections settle over the radio, so let the microtasks drain. */
function flushRadioEvents(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

const UNKNOWN_HANDLE: DeviceHandle = { id: "never-connected", name: "Ghost" };

describe("Bluetooth.startScan", () => {
  const WATER_SERVICE = "b1f8707e-0001-0000-0000-000000000000";
  const HEATER_SERVICE = "b1f8707e-0002-0000-0000-000000000000";

  it("asks the radio for every requested service in one scan", async () => {
    const { bluetooth, radio } = bluetoothOn(new FakeRadio());

    await bluetooth.startScan([WATER_SERVICE, HEATER_SERVICE], () => {});

    expect(radio.scanRequest?.uuids).toEqual([WATER_SERVICE, HEATER_SERVICE]);
  });

  it("keeps duplicate advertisements out of the scan", async () => {
    const { bluetooth, radio } = bluetoothOn(new FakeRadio());

    await bluetooth.startScan([WATER_SERVICE], () => {});

    expect(radio.scanRequest?.options).toEqual({ allowDuplicates: false });
  });

  it("hands the advertised services to the caller, so a result can be typed", async () => {
    const { bluetooth, radio } = bluetoothOn(new FakeRadio());
    const found: DiscoveredBluetoothDevice[] = [];

    await bluetooth.startScan([WATER_SERVICE], (device) => found.push(device));
    radio.broadcast({
      id: "water-id",
      name: "Water Module",
      serviceUUIDs: [WATER_SERVICE],
    });

    expect(found).toEqual([
      {
        id: "water-id",
        name: "Water Module",
        serviceUuids: [WATER_SERVICE],
      },
    ]);
  });

  it("reports an advertisement carrying no service as an empty list", async () => {
    const { bluetooth, radio } = bluetoothOn(new FakeRadio());
    const found: DiscoveredBluetoothDevice[] = [];

    await bluetooth.startScan([WATER_SERVICE], (device) => found.push(device));
    radio.broadcast({ id: "water-id", name: "Water Module" });

    expect(found[0].serviceUuids).toEqual([]);
  });
});

describe("Bluetooth.connect", () => {
  it("returns a handle carrying the id and name of the device", async () => {
    const { bluetooth } = bluetoothReaching("water-id", "Water Module");

    const handle = await bluetooth.connect("water-id");

    expect(handle).toEqual({ id: "water-id", name: "Water Module" });
  });

  it("names a handle with an empty string when the device advertises none", async () => {
    const { bluetooth } = bluetoothReaching("water-id", null);

    const handle = await bluetooth.connect("water-id");

    expect(handle.name).toBe("");
  });

  it("negotiates the MTU and discovers the services before handing out the handle", async () => {
    const { bluetooth, device } = bluetoothReaching("water-id", "Water Module");

    await bluetooth.connect("water-id");

    expect(device.mtu).toBe(185);
    expect(device.isDiscovered).toBe(true);
  });

  it("registers the connection so a transport can resolve the handle", async () => {
    const { bluetooth, connections, device } = bluetoothReaching(
      "water-id",
      "Water Module",
    );

    const handle = await bluetooth.connect("water-id");

    expect(connections.find(handle)).toBe(device);
  });

  it("forgets the connection once the radio drops it", async () => {
    const { bluetooth, connections, radio } = bluetoothReaching(
      "water-id",
      "Water Module",
    );
    const handle = await bluetooth.connect("water-id");

    radio.dropConnection("water-id");
    await flushRadioEvents();

    expect(connections.find(handle)).toBeUndefined();
  });
});

describe("Bluetooth.disconnect", () => {
  it("closes the connection behind the handle", async () => {
    const { bluetooth, device } = bluetoothReaching("water-id", "Water Module");
    const handle = await bluetooth.connect("water-id");

    await bluetooth.disconnect(handle);

    expect(device.isCancelled).toBe(true);
  });

  it("forgets the connection", async () => {
    const { bluetooth, connections } = bluetoothReaching(
      "water-id",
      "Water Module",
    );
    const handle = await bluetooth.connect("water-id");

    await bluetooth.disconnect(handle);

    expect(connections.find(handle)).toBeUndefined();
  });

  it("does nothing for a handle it never issued", async () => {
    const { bluetooth } = bluetoothOn(new FakeRadio());

    await expect(bluetooth.disconnect(UNKNOWN_HANDLE)).resolves.toBeUndefined();
  });
});

describe("Bluetooth reconnection", () => {
  it("keeps the new connection when the disconnect of the previous one resolves afterwards", async () => {
    const { bluetooth, connections, dropped, reconnected } =
      bluetoothReconnecting("water-id", "Water Module");
    const staleHandle = await bluetooth.connect("water-id");
    dropped.holdCancellation();
    const pendingDisconnect = bluetooth.disconnect(staleHandle);

    const handle = await bluetooth.connect("water-id");
    dropped.settleCancellation();
    await pendingDisconnect;
    await flushRadioEvents();

    expect(connections.find(handle)).toBe(reconnected);
  });

  // Android reconnects by cancelling the live link first, so its teardown
  // event can land after the new connection is already registered.
  it("keeps the new connection when a disconnect event of the previous one lands late", async () => {
    const { bluetooth, connections, radio, reconnected } =
      bluetoothReconnecting("water-id", "Water Module");
    await bluetooth.connect("water-id");

    const handle = await bluetooth.connect("water-id");
    radio.staleTeardownEvent("water-id");
    await flushRadioEvents();

    expect(connections.find(handle)).toBe(reconnected);
  });

  it("unsubscribes the previous device when the same id connects again", async () => {
    const { bluetooth, radio } = bluetoothReconnecting(
      "water-id",
      "Water Module",
    );
    await bluetooth.connect("water-id");

    await bluetooth.connect("water-id");

    expect(radio.disconnectionListenersFor("water-id")).toBe(1);
  });
});

describe("Bluetooth.onDisconnected", () => {
  it("calls the listener when the device goes away", async () => {
    const { bluetooth, radio } = bluetoothReaching("water-id", "Water Module");
    const handle = await bluetooth.connect("water-id");
    let notified = false;

    bluetooth.onDisconnected(handle, () => {
      notified = true;
    });
    radio.dropConnection("water-id");

    expect(notified).toBe(true);
  });

  it("stops notifying once unsubscribed", async () => {
    const { bluetooth, radio } = bluetoothReaching("water-id", "Water Module");
    const handle = await bluetooth.connect("water-id");
    let notified = false;

    const unsubscribe = bluetooth.onDisconnected(handle, () => {
      notified = true;
    });
    unsubscribe();
    radio.dropConnection("water-id");

    expect(notified).toBe(false);
  });

  it("hands back a no-op unsubscribe for a handle it never issued", () => {
    const { bluetooth } = bluetoothOn(new FakeRadio());

    const unsubscribe = bluetooth.onDisconnected(UNKNOWN_HANDLE, () => {});

    expect(() => unsubscribe()).not.toThrow();
  });
});
