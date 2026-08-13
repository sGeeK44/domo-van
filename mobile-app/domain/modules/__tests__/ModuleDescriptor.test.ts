import { describe, expect, it } from "vitest";
import { JK_BMS_SERVICE_UUID } from "@/domain/battery/JkBmsUuids";
import { buildServiceUuid } from "@/domain/modules/BleUuid";
import {
  ALL_MODULES,
  BATTERY_MODULE,
  HEATER_MODULE,
  WATER_MODULE,
} from "@/domain/modules/ModuleDescriptor";

describe("ModuleDescriptor", () => {
  it("gives every module a distinct key", () => {
    const keys = ALL_MODULES.map((module) => module.key);

    expect(new Set(keys).size).toBe(ALL_MODULES.length);
  });

  it("lists every module the app knows how to talk to", () => {
    expect(ALL_MODULES).toEqual([WATER_MODULE, HEATER_MODULE, BATTERY_MODULE]);
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
