import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Mock expo-secure-store
vi.mock("expo-secure-store", () => {
  const store = new Map<string, string>();
  return {
    getItemAsync: vi.fn((key: string) =>
      Promise.resolve(store.get(key) ?? null),
    ),
    setItemAsync: vi.fn((key: string, value: string) => {
      store.set(key, value);
      return Promise.resolve();
    }),
    deleteItemAsync: vi.fn((key: string) => {
      store.delete(key);
      return Promise.resolve();
    }),
    __store: store, // Expose for test manipulation
  };
});

import * as SecureStore from "expo-secure-store";
import type { DeviceInfo } from "@/domain/ports/DeviceRepository";
import { SecureStoreDeviceRepository } from "@/infrastructure/storage/SecureStoreDeviceRepository";

describe("SecureStoreDeviceRepository", () => {
  let repository: SecureStoreDeviceRepository;

  beforeEach(() => {
    repository = new SecureStoreDeviceRepository();
    vi.clearAllMocks();
    // Clear the mock store
    (
      SecureStore as unknown as { __store: Map<string, string> }
    ).__store.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("getLastDevice", () => {
    it("returns null when no device is stored", async () => {
      const result = await repository.getLastDevice("water");
      expect(result).toBeNull();
      expect(SecureStore.getItemAsync).toHaveBeenCalledWith(
        "water_module_last_device",
      );
    });

    it("returns stored device info", async () => {
      const deviceInfo: DeviceInfo = {
        id: "AA:BB:CC:DD:EE:FF",
        name: "Water Module",
      };
      (SecureStore as unknown as { __store: Map<string, string> }).__store.set(
        "water_module_last_device",
        JSON.stringify(deviceInfo),
      );

      const result = await repository.getLastDevice("water");
      expect(result).toEqual(deviceInfo);
    });

    it("returns null for invalid JSON", async () => {
      (SecureStore as unknown as { __store: Map<string, string> }).__store.set(
        "water_module_last_device",
        "invalid-json",
      );

      const result = await repository.getLastDevice("water");
      expect(result).toBeNull();
    });
  });

  describe("setLastDevice", () => {
    it("stores the device info", async () => {
      const deviceInfo: DeviceInfo = {
        id: "11:22:33:44:55:66",
        name: "My Module",
      };
      await repository.setLastDevice(deviceInfo, "water");

      expect(SecureStore.setItemAsync).toHaveBeenCalledWith(
        "water_module_last_device",
        JSON.stringify(deviceInfo),
      );

      // Verify it was actually stored
      const stored = await repository.getLastDevice("water");
      expect(stored).toEqual(deviceInfo);
    });

    it("overwrites existing device info", async () => {
      await repository.setLastDevice(
        { id: "first-device", name: "First" },
        "water",
      );
      await repository.setLastDevice(
        { id: "second-device", name: "Second" },
        "water",
      );

      const stored = await repository.getLastDevice("water");
      expect(stored).toEqual({ id: "second-device", name: "Second" });
    });
  });

  describe("clearLastDevice", () => {
    it("removes the stored device info", async () => {
      const deviceInfo: DeviceInfo = {
        id: "device-to-remove",
        name: "Remove Me",
      };
      await repository.setLastDevice(deviceInfo, "water");
      expect(await repository.getLastDevice("water")).toEqual(deviceInfo);

      await repository.clearLastDevice("water");
      expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith(
        "water_module_last_device",
      );

      const result = await repository.getLastDevice("water");
      expect(result).toBeNull();
    });
  });
});
