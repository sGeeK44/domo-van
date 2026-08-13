import { describe, expect, it } from "vitest";
import { JK_BMS_SERVICE_UUID } from "@/domain/battery/JkBmsUuids";
import { buildServiceUuid } from "@/domain/modules/BleUuid";
import {
  ALL_MODULES,
  ALL_SCAN_SERVICE_UUIDS,
  BATTERY_MODULE,
  HEATER_MODULE,
  moduleForAdvertisement,
  WATER_MODULE,
} from "@/domain/modules/ModuleDescriptor";

describe("ModuleDescriptor", () => {
  it("gives every module a distinct key", () => {
    const keys = ALL_MODULES.map((module) => module.key);

    expect(new Set(keys).size).toBe(ALL_MODULES.length);
  });

  it("lists every module the app knows how to talk to, in display order", () => {
    expect(ALL_MODULES).toEqual([BATTERY_MODULE, WATER_MODULE, HEATER_MODULE]);
  });

  it("gives every module a tab label and an icon", () => {
    for (const module of ALL_MODULES) {
      expect(module.tabTitle).not.toBe("");
      expect(module.tabIcon).not.toBe("");
    }
  });

  it("scans a van module on the service its own id builds", () => {
    for (const module of [WATER_MODULE, HEATER_MODULE]) {
      expect(module.serviceId).not.toBeNull();
      expect(module.scanServiceUuid).toBe(
        buildServiceUuid(module.serviceId as string),
      );
    }
  });

  it("gives the two van modules different services", () => {
    expect(WATER_MODULE.scanServiceUuid).not.toBe(
      HEATER_MODULE.scanServiceUuid,
    );
  });

  it("scans the battery on the BMS vendor service, outside the van scheme", () => {
    expect(BATTERY_MODULE.serviceId).toBeNull();
    expect(BATTERY_MODULE.scanServiceUuid).toBe(JK_BMS_SERVICE_UUID);
  });
});

describe("ALL_SCAN_SERVICE_UUIDS", () => {
  it("covers the service of every module, so one scan finds them all", () => {
    expect(ALL_SCAN_SERVICE_UUIDS).toEqual(
      ALL_MODULES.map((module) => module.scanServiceUuid),
    );
  });
});

describe("moduleForAdvertisement", () => {
  it("types an advertisement carrying the service of a module", () => {
    expect(moduleForAdvertisement([HEATER_MODULE.scanServiceUuid])).toBe(
      HEATER_MODULE,
    );
  });

  it("types an advertisement whose service comes uppercased, as iOS reports it", () => {
    const shouted = WATER_MODULE.scanServiceUuid.toUpperCase();

    expect(moduleForAdvertisement([shouted])).toBe(WATER_MODULE);
  });

  it("types a device advertising a foreign service alongside a known one", () => {
    const advertisement = [
      "0000180a-0000-1000-8000-00805f9b34fb",
      BATTERY_MODULE.scanServiceUuid,
    ];

    expect(moduleForAdvertisement(advertisement)).toBe(BATTERY_MODULE);
  });

  it("types nothing when no advertised service belongs to a module", () => {
    expect(
      moduleForAdvertisement(["0000ffff-0000-1000-8000-00805f9b34fb"]),
    ).toBeNull();
  });

  it("types nothing when the advertisement carries no service at all", () => {
    expect(moduleForAdvertisement([])).toBeNull();
  });
});
