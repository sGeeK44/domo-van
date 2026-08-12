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

/** Resolves a `DeviceHandle` to its `Device`, whose disconnect it watches. */
export class BleConnections {
  private readonly connections = new Map<string, Connection>();

  add(device: Device): DeviceHandle {
    this.evict(device.id);
    const disconnection = device.onDisconnected(() => {
      void this.removeIfDropped(device);
    });
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
    if (!this.isRegistered(device)) return;
    this.evict(device.id);
  }

  /** ble-plx reports a disconnection by id, never by link: ask the radio. */
  private async removeIfDropped(device: Device): Promise<void> {
    if (!this.isRegistered(device)) return;
    if (await this.isStillConnected(device)) return;

    this.remove(device);
  }

  /** A liveness question the radio cannot answer counts as a drop. */
  private async isStillConnected(device: Device): Promise<boolean> {
    try {
      return await device.isConnected();
    } catch {
      return false;
    }
  }

  private isRegistered(device: Device): boolean {
    return this.connections.get(device.id)?.device === device;
  }

  private evict(deviceId: string): void {
    const connection = this.connections.get(deviceId);
    if (!connection) return;

    this.connections.delete(deviceId);
    connection.disconnection.remove();
  }
}
