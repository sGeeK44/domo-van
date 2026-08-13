import { describe, expect, it } from "vitest";
import {
  ALL_MODULES,
  ALL_SCAN_SERVICE_UUIDS,
  BATTERY_MODULE,
  moduleForAdvertisement,
  WATER_MODULE,
} from "@/domain/modules/ModuleDescriptor";
import type { DiscoveredBluetoothDevice } from "@/domain/ports/BluetoothScanner";
import {
  FakeBluetooth,
  fakePairedDevices,
  UnadvertisedDeviceError,
} from "@/infrastructure/fake/FakeBluetooth";

async function scan(
  ...serviceUuids: readonly string[]
): Promise<DiscoveredBluetoothDevice[]> {
  const found: DiscoveredBluetoothDevice[] = [];
  await new FakeBluetooth().startScan(serviceUuids, (device) =>
    found.push(device),
  );
  return found;
}

describe("FakeBluetooth", () => {
  it("advertises exactly one device on the service a module scans", async () => {
    const found = await scan(WATER_MODULE.scanServiceUuid);

    expect(found).toHaveLength(1);
    expect(found[0].name).toContain(WATER_MODULE.displayName);
  });

  it("advertises a device for every module in the catalogue", async () => {
    for (const module of ALL_MODULES) {
      const found = await scan(module.scanServiceUuid);

      expect(found).toHaveLength(1);
    }
  });

  it("hands the whole catalogue to a single scan asking for every service", async () => {
    const found = await scan(...ALL_SCAN_SERVICE_UUIDS);

    expect(found).toHaveLength(ALL_MODULES.length);
  });

  it("advertises each device with the service that types it back to its module", async () => {
    const found = await scan(...ALL_SCAN_SERVICE_UUIDS);

    expect(
      found.map((device) => moduleForAdvertisement(device.serviceUuids)),
    ).toEqual([...ALL_MODULES]);
  });

  it("finds nothing on a service no module advertises", async () => {
    const found = await scan("0000ffff-0000-1000-8000-00805f9b34fb");

    expect(found).toHaveLength(0);
  });

  it("gives each module its own device id", async () => {
    const battery = await scan(BATTERY_MODULE.scanServiceUuid);
    const water = await scan(WATER_MODULE.scanServiceUuid);

    expect(battery[0].id).not.toBe(water[0].id);
  });

  it("connects to an advertised device with no radio in the room", async () => {
    const [advertised] = await scan(WATER_MODULE.scanServiceUuid);

    const handle = await new FakeBluetooth().connect(advertised.id);

    expect(handle).toEqual({ id: advertised.id, name: advertised.name });
  });

  it("refuses a device it never advertised", async () => {
    const connecting = new FakeBluetooth().connect("AA:BB:CC:DD:EE:FF");

    await expect(connecting).rejects.toThrow(UnadvertisedDeviceError);
  });

  it("never reports a disconnection, not even when asked to disconnect", async () => {
    const bluetooth = new FakeBluetooth();
    const handle = await bluetooth.connect(fakePairedDevices()[0][1].id);
    let dropped = false;

    bluetooth.onDisconnected(handle, () => {
      dropped = true;
    });
    await bluetooth.disconnect(handle);

    expect(dropped).toBe(false);
  });

  it("pairs every module up front, so no screen waits on a scan", () => {
    const paired = fakePairedDevices();

    expect(paired.map(([key]) => key)).toEqual(
      ALL_MODULES.map((module) => module.key),
    );
  });

  it("pairs each module with the device that module's scan finds", async () => {
    for (const [, device] of fakePairedDevices()) {
      await expect(new FakeBluetooth().connect(device.id)).resolves.toEqual(
        device,
      );
    }
  });
});
