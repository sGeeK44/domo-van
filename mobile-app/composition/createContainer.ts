import type { DeviceRepository } from "@/domain/ports/DeviceRepository";
import { BleTransportFactory } from "@/infrastructure/ble/BleTransportFactory";
import {
  type Bluetooth,
  createBluetooth,
} from "@/infrastructure/ble/Bluetooth";
import { SecureStoreDeviceRepository } from "@/infrastructure/storage/SecureStoreDeviceRepository";

export type Container = {
  bluetooth: Bluetooth;
  transports: BleTransportFactory;
  deviceRepository: DeviceRepository;
};

/**
 * The single place where concrete implementations are bound to domain
 * interfaces. Nothing else in the app is allowed to `new` an adapter.
 */
export function createContainer(): Container {
  return {
    bluetooth: createBluetooth(),
    transports: new BleTransportFactory(),
    deviceRepository: new SecureStoreDeviceRepository(),
  };
}
