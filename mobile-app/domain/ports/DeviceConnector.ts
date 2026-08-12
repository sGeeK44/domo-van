import type { Unsubscribe } from "@/core/observable";
import type { DeviceHandle } from "@/domain/ports/DeviceHandle";

/** Owns the live connection kept out of `BluetoothScanner` by design. */
export interface DeviceConnector {
  connect(deviceId: string): Promise<DeviceHandle>;
  disconnect(device: DeviceHandle): Promise<void>;
  onDisconnected(device: DeviceHandle, listener: () => void): Unsubscribe;
}
