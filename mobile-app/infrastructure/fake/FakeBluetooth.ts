import type { Unsubscribe } from "@/core/observable";
import {
  ALL_MODULES,
  type ModuleDescriptor,
  type ModuleKey,
} from "@/domain/modules/ModuleDescriptor";
import type {
  BluetoothScanner,
  DiscoveredBluetoothDevice,
} from "@/domain/ports/BluetoothScanner";
import type { DeviceConnector } from "@/domain/ports/DeviceConnector";
import type { DeviceHandle } from "@/domain/ports/DeviceHandle";
import type { DeviceInfo } from "@/domain/ports/DeviceRepository";

export class UnadvertisedDeviceError extends Error {
  constructor(deviceId: string) {
    super(`No fake device advertises the id "${deviceId}".`);
    this.name = "UnadvertisedDeviceError";
  }
}

function fakeDeviceFor(module: ModuleDescriptor): DiscoveredBluetoothDevice {
  return { id: `fake-${module.key}`, name: `${module.displayName} (fake)` };
}

/** The pairings a fake install starts from, so no screen waits on a scan. */
export function fakePairedDevices(): [ModuleKey, DeviceInfo][] {
  return ALL_MODULES.map((module) => [module.key, fakeDeviceFor(module)]);
}

/** A radio advertising the module catalogue, whose links never drop. */
export class FakeBluetooth implements BluetoothScanner, DeviceConnector {
  private readonly advertised = new Map(
    ALL_MODULES.map((module) => [
      fakeDeviceFor(module).id,
      { module, device: fakeDeviceFor(module) },
    ]),
  );

  async startScan(
    serviceUuid: string,
    onDeviceFound: (device: DiscoveredBluetoothDevice) => void,
  ): Promise<void> {
    for (const { module, device } of this.advertised.values()) {
      if (module.scanServiceUuid === serviceUuid) onDeviceFound(device);
    }
  }

  async stopScan(): Promise<void> {}

  async connect(deviceId: string): Promise<DeviceHandle> {
    const found = this.advertised.get(deviceId);
    if (!found) throw new UnadvertisedDeviceError(deviceId);
    return { id: found.device.id, name: found.device.name };
  }

  async disconnect(_device: DeviceHandle): Promise<void> {}

  onDisconnected(_device: DeviceHandle, _listener: () => void): Unsubscribe {
    return () => {};
  }
}
