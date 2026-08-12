import type { Device, Subscription } from "react-native-ble-plx";
import type { DeviceHandle } from "@/domain/ports/DeviceHandle";

export class UnknownDeviceError extends Error {
  constructor(deviceId: string) {
    super(`No live BLE connection for device "${deviceId}".`);
    this.name = "UnknownDeviceError";
  }
}

type Connection = {
  device: Device;
  disconnection: Subscription;
};

/** Resolves a `DeviceHandle` back to the ble-plx `Device` it stands for. */
export class BleConnections {
  private readonly connections = new Map<string, Connection>();

  add(device: Device): DeviceHandle {
    this.evict(device.id);
    const disconnection = device.onDisconnected(() => this.remove(device));
    this.connections.set(device.id, { device, disconnection });
    return { id: device.id, name: device.name ?? "" };
  }

  find(handle: DeviceHandle): Device | undefined {
    return this.connections.get(handle.id)?.device;
  }

  require(handle: DeviceHandle): Device {
    const device = this.find(handle);
    if (!device) throw new UnknownDeviceError(handle.id);
    return device;
  }

  /** Identity-keyed: a late drop must not evict a newer device. */
  remove(device: Device): void {
    if (this.connections.get(device.id)?.device !== device) return;
    this.evict(device.id);
  }

  private evict(deviceId: string): void {
    const connection = this.connections.get(deviceId);
    if (!connection) return;

    connection.disconnection.remove();
    this.connections.delete(deviceId);
  }
}
