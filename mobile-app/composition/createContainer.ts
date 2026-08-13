import type { BluetoothScanner } from "@/domain/ports/BluetoothScanner";
import type { DeviceConnector } from "@/domain/ports/DeviceConnector";
import type { DeviceRepository } from "@/domain/ports/DeviceRepository";
import type { TransportFactory } from "@/domain/ports/TransportFactory";
import { BleConnections } from "@/infrastructure/ble/BleConnections";
import { BleTransportFactory } from "@/infrastructure/ble/BleTransportFactory";
import { createBluetooth } from "@/infrastructure/ble/Bluetooth";
import {
  FakeBluetooth,
  fakePairedDevices,
} from "@/infrastructure/fake/FakeBluetooth";
import { FakeTransportFactory } from "@/infrastructure/fake/FakeTransportFactory";
import { InMemoryDeviceRepository } from "@/infrastructure/fake/InMemoryDeviceRepository";
import { SecureStoreDeviceRepository } from "@/infrastructure/storage/SecureStoreDeviceRepository";

export type Container = {
  bluetooth: BluetoothScanner & DeviceConnector;
  transports: TransportFactory;
  deviceRepository: DeviceRepository;
};

/** A real BMS pushes telemetry unprompted; the fake one has to be told to. */
const FAKE_BMS_PUSH_MS = 1000;

/**
 * The single place where concrete implementations are bound to domain
 * interfaces. Nothing else in the app is allowed to `new` an adapter.
 */
export function createContainer(): Container {
  return isFakeBleEnabled() ? fakeContainer() : bleContainer();
}

/** Expo inlines `EXPO_PUBLIC_*` at build time, so this is a build-time switch. */
function isFakeBleEnabled(): boolean {
  return process.env.EXPO_PUBLIC_FAKE_BLE === "1";
}

function bleContainer(): Container {
  const connections = new BleConnections();

  return {
    bluetooth: createBluetooth(connections),
    transports: new BleTransportFactory(connections),
    deviceRepository: new SecureStoreDeviceRepository(),
  };
}

function fakeContainer(): Container {
  return {
    bluetooth: new FakeBluetooth(),
    transports: new FakeTransportFactory({
      telemetryIntervalMs: FAKE_BMS_PUSH_MS,
    }),
    deviceRepository: new InMemoryDeviceRepository(fakePairedDevices()),
  };
}
