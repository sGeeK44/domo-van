import { JK_BMS_SERVICE_UUID } from "@/domain/battery/JkBmsUuids";
import { buildServiceUuid } from "@/domain/modules/BleUuid";

export type ModuleKey = "water" | "heater" | "battery";

export type ModuleDescriptor = {
  key: ModuleKey;
  displayName: string;
  /**
   * Service id in the van's own UUID scheme, or `null` for a third-party
   * device that does not follow it.
   */
  serviceId: string | null;
  /** Service UUID advertised by the device, used to filter a BLE scan. */
  scanServiceUuid: string;
};

export const WATER_MODULE: ModuleDescriptor = {
  key: "water",
  displayName: "Water Module",
  serviceId: "0001",
  scanServiceUuid: buildServiceUuid("0001"),
};

export const HEATER_MODULE: ModuleDescriptor = {
  key: "heater",
  displayName: "Heater Module",
  serviceId: "0002",
  scanServiceUuid: buildServiceUuid("0002"),
};

export const BATTERY_MODULE: ModuleDescriptor = {
  key: "battery",
  displayName: "JK BMS",
  serviceId: null,
  scanServiceUuid: JK_BMS_SERVICE_UUID,
};

export const ALL_MODULES: readonly ModuleDescriptor[] = [
  WATER_MODULE,
  HEATER_MODULE,
  BATTERY_MODULE,
];

/** Every service worth listening to, so one scan finds all module types. */
export const ALL_SCAN_SERVICE_UUIDS: readonly string[] = ALL_MODULES.map(
  (module) => module.scanServiceUuid,
);

// ble-plx lowercases UUIDs on Android and uppercases them on iOS.
export function moduleForAdvertisement(
  serviceUuids: readonly string[],
): ModuleDescriptor | null {
  const advertised = serviceUuids.map((uuid) => uuid.toLowerCase());
  return (
    ALL_MODULES.find((module) =>
      advertised.includes(module.scanServiceUuid.toLowerCase()),
    ) ?? null
  );
}
