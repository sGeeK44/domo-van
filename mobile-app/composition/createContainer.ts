import type { BluetoothScanner } from "@/domain/ports/BluetoothScanner";
import type { DeviceConnector } from "@/domain/ports/DeviceConnector";
import type { DeviceRepository } from "@/domain/ports/DeviceRepository";
import type { TransportFactory } from "@/domain/ports/TransportFactory";
import { BleConnections } from "@/infrastructure/ble/BleConnections";
import { BleTransportFactory } from "@/infrastructure/ble/BleTransportFactory";
import { createBluetooth } from "@/infrastructure/ble/Bluetooth";
import { SecureStoreDeviceRepository } from "@/infrastructure/storage/SecureStoreDeviceRepository";

export type Container = {
  bluetooth: BluetoothScanner & DeviceConnector;
  transports: TransportFactory;
  deviceRepository: DeviceRepository;
};

/**
 * The single place where concrete implementations are bound to domain
 * interfaces. Nothing else in the app is allowed to `new` an adapter.
 */
export function createContainer(): Container {
  const connections = new BleConnections();

  return {
    bluetooth: createBluetooth(connections),
    transports: new BleTransportFactory(connections),
    deviceRepository: new SecureStoreDeviceRepository(),
  };
}
