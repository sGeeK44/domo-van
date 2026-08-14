import { JK_BMS_SERVICE_UUID } from "@/domain/battery/JkBmsUuids";
import { buildServiceUuid } from "@/domain/modules/BleUuid";

export type ModuleKey = "water" | "heater" | "battery";

export type ModuleDescriptor = {
  key: ModuleKey;
  /** Translation key, not copy: the catalogue names a string it cannot read. */
  displayNameKey: `modules.${ModuleKey}.name`;
  /**
   * Service id in the van's own UUID scheme, or `null` for a third-party
   * device that does not follow it.
   */
  serviceId: string | null;
  /** Service UUID advertised by the device, used to filter a BLE scan. */
  scanServiceUuid: string;
  /** Translation key of the tab label the module gets once it is paired. */
  tabTitleKey: `modules.${ModuleKey}.tab`;
  /** Icon name, a plain string so the catalogue names no icon set. */
  tabIcon: string;
};

export const WATER_MODULE: ModuleDescriptor = {
  key: "water",
  displayNameKey: "modules.water.name",
  serviceId: "0001",
  scanServiceUuid: buildServiceUuid("0001"),
  tabTitleKey: "modules.water.tab",
  tabIcon: "water-drop",
};

export const HEATER_MODULE: ModuleDescriptor = {
  key: "heater",
  displayNameKey: "modules.heater.name",
  serviceId: "0002",
  scanServiceUuid: buildServiceUuid("0002"),
  tabTitleKey: "modules.heater.tab",
  tabIcon: "local-fire-department",
};

export const BATTERY_MODULE: ModuleDescriptor = {
  key: "battery",
  displayNameKey: "modules.battery.name",
  serviceId: null,
  scanServiceUuid: JK_BMS_SERVICE_UUID,
  tabTitleKey: "modules.battery.tab",
  tabIcon: "battery-full",
};

/** Catalogue order is display order: it drives the tab bar and the dashboard. */
export const ALL_MODULES: readonly ModuleDescriptor[] = [
  BATTERY_MODULE,
  WATER_MODULE,
  HEATER_MODULE,
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
