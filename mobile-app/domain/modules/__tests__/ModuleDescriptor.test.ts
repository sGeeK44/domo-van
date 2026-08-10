import { describe, expect, it } from "vitest";
import { JK_BMS_SERVICE_UUID } from "@/domain/battery/JkBmsUuids";
import { buildServiceUuid } from "@/domain/modules/BleUuid";
import {
  BATTERY_MODULE,
  HEATER_MODULE,
  type ModuleDescriptor,
  WATER_MODULE,
} from "@/domain/modules/ModuleDescriptor";

const MODULES: ModuleDescriptor[] = [
  WATER_MODULE,
  HEATER_MODULE,
  BATTERY_MODULE,
];

describe("ModuleDescriptor", () => {
  it("gives every module a distinct key", () => {
    const keys = MODULES.map((module) => module.key);

    expect(new Set(keys).size).toBe(MODULES.length);
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
