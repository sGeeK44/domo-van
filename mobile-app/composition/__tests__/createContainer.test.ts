import { afterEach, describe, expect, it, vi } from "vitest";
// The stub the vitest alias substitutes for the real radio, counter included.
import { BleManager } from "@/__mocks__/react-native-ble-plx";
import { createContainer } from "@/composition/createContainer";
import { BATTERY_MODULE } from "@/domain/modules/ModuleDescriptor";
import { BleTransportFactory } from "@/infrastructure/ble/BleTransportFactory";
import { Bluetooth } from "@/infrastructure/ble/Bluetooth";
import { FakeBluetooth } from "@/infrastructure/fake/FakeBluetooth";
import { FakeTransportFactory } from "@/infrastructure/fake/FakeTransportFactory";
import { InMemoryDeviceRepository } from "@/infrastructure/fake/InMemoryDeviceRepository";
import { InMemoryPreferencesRepository } from "@/infrastructure/fake/InMemoryPreferencesRepository";
import { AsyncStoragePreferencesRepository } from "@/infrastructure/storage/AsyncStoragePreferencesRepository";
import { SecureStoreDeviceRepository } from "@/infrastructure/storage/SecureStoreDeviceRepository";

function withFakeBle(value: string | undefined): void {
  if (value === undefined) delete process.env.EXPO_PUBLIC_FAKE_BLE;
  else process.env.EXPO_PUBLIC_FAKE_BLE = value;
}

describe("createContainer", () => {
  afterEach(() => {
    withFakeBle(undefined);
    vi.useRealTimers();
  });

  it("binds the BLE stack when EXPO_PUBLIC_FAKE_BLE is unset", () => {
    withFakeBle(undefined);

    const container = createContainer();

    expect(container.bluetooth).toBeInstanceOf(Bluetooth);
    expect(container.transports).toBeInstanceOf(BleTransportFactory);
    expect(container.deviceRepository).toBeInstanceOf(
      SecureStoreDeviceRepository,
    );
    expect(container.preferences).toBeInstanceOf(
      AsyncStoragePreferencesRepository,
    );
  });

  it("binds the BLE stack for any value of EXPO_PUBLIC_FAKE_BLE other than 1", () => {
    for (const value of ["", "0", "true", "yes", "01"]) {
      withFakeBle(value);

      expect(createContainer().bluetooth).toBeInstanceOf(Bluetooth);
    }
  });

  it("binds the fake stack when EXPO_PUBLIC_FAKE_BLE is 1", () => {
    withFakeBle("1");

    const container = createContainer();

    expect(container.bluetooth).toBeInstanceOf(FakeBluetooth);
    expect(container.transports).toBeInstanceOf(FakeTransportFactory);
    expect(container.deviceRepository).toBeInstanceOf(InMemoryDeviceRepository);
    expect(container.preferences).toBeInstanceOf(InMemoryPreferencesRepository);
  });

  it("creates no native BLE client in fake mode", () => {
    withFakeBle("1");
    const before = BleManager.clientsCreated;

    createContainer();

    expect(BleManager.clientsCreated).toBe(before);
  });

  it("creates the one native BLE client the real stack needs", () => {
    withFakeBle(undefined);
    const before = BleManager.clientsCreated;

    createContainer();

    expect(BleManager.clientsCreated).toBe(before + 1);
  });

  it("pushes BMS telemetry unprompted in fake mode, so lastUpdate keeps moving", () => {
    vi.useFakeTimers();
    withFakeBle("1");
    const container = createContainer();
    const pushed: Uint8Array[] = [];

    container.transports
      .binaryTransport({ id: BATTERY_MODULE.key, name: "" })
      .listen((bytes) => pushed.push(bytes));
    vi.advanceTimersByTime(2_000);

    expect(pushed.length).toBeGreaterThan(0);
  });
});
