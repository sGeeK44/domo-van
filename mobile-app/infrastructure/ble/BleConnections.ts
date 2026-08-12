import type { Device } from "react-native-ble-plx";
import type { DeviceHandle } from "@/domain/ports/DeviceHandle";

export class UnknownDeviceError extends Error {
  constructor(deviceId: string) {
    super(`No live BLE connection for device "${deviceId}".`);
    this.name = "UnknownDeviceError";
  }
}

/** Resolves a `DeviceHandle` back to the ble-plx `Device` it stands for. */
export class BleConnections {
  private readonly devices = new Map<string, Device>();

  add(device: Device): DeviceHandle {
    this.devices.set(device.id, device);
    return { id: device.id, name: device.name ?? "" };
  }

  find(handle: DeviceHandle): Device | undefined {
    return this.devices.get(handle.id);
  }

  require(handle: DeviceHandle): Device {
    const device = this.find(handle);
    if (!device) throw new UnknownDeviceError(handle.id);
    return device;
  }

  remove(deviceId: string): void {
    this.devices.delete(deviceId);
  }
}
