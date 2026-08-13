import { describe, expect, it } from "vitest";
import type { DeviceInfo } from "@/domain/ports/DeviceRepository";
import { InMemoryDeviceRepository } from "@/infrastructure/fake/InMemoryDeviceRepository";

const TANK: DeviceInfo = { id: "fake-water", name: "Water Module (fake)" };
const BMS: DeviceInfo = { id: "fake-battery", name: "JK BMS (fake)" };

describe("InMemoryDeviceRepository", () => {
  it("hands back the pairing it was seeded with", async () => {
    const repository = new InMemoryDeviceRepository([["water", TANK]]);

    await expect(repository.getLastDevice("water")).resolves.toEqual(TANK);
  });

  it("knows nothing about a module it was not given", async () => {
    const repository = new InMemoryDeviceRepository([["water", TANK]]);

    await expect(repository.getLastDevice("heater")).resolves.toBeNull();
  });

  it("starts empty when seeded with nothing", async () => {
    const repository = new InMemoryDeviceRepository();

    await expect(repository.getLastDevice("water")).resolves.toBeNull();
  });

  it("remembers the device a module was just paired with", async () => {
    const repository = new InMemoryDeviceRepository();

    await repository.setLastDevice(BMS, "battery");

    await expect(repository.getLastDevice("battery")).resolves.toEqual(BMS);
  });

  it("forgets only the module it was told to clear", async () => {
    const repository = new InMemoryDeviceRepository([
      ["water", TANK],
      ["battery", BMS],
    ]);

    await repository.clearLastDevice("water");

    await expect(repository.getLastDevice("water")).resolves.toBeNull();
    await expect(repository.getLastDevice("battery")).resolves.toEqual(BMS);
  });
});
