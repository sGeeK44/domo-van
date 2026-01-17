import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Mock expo-secure-store
vi.mock("expo-secure-store", () => {
  const store = new Map<string, string>();
  return {
    getItemAsync: vi.fn((key: string) => Promise.resolve(store.get(key) ?? null)),
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

import { DeviceStorage } from "@/hooks/DeviceStorage";
import * as SecureStore from "expo-secure-store";

describe("DeviceStorage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Clear the mock store
    (SecureStore as unknown as { __store: Map<string, string> }).__store.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("getLastDeviceId", () => {
    it("returns null when no device ID is stored", async () => {
      const result = await DeviceStorage.getLastDeviceId();
      expect(result).toBeNull();
      expect(SecureStore.getItemAsync).toHaveBeenCalledWith(
        "water_module_last_device_id"
      );
    });

    it("returns stored device ID", async () => {
      const deviceId = "AA:BB:CC:DD:EE:FF";
      (SecureStore as unknown as { __store: Map<string, string> }).__store.set(
        "water_module_last_device_id",
        deviceId
      );

      const result = await DeviceStorage.getLastDeviceId();
      expect(result).toBe(deviceId);
    });
  });

  describe("setLastDeviceId", () => {
    it("stores the device ID", async () => {
      const deviceId = "11:22:33:44:55:66";
      await DeviceStorage.setLastDeviceId(deviceId);

      expect(SecureStore.setItemAsync).toHaveBeenCalledWith(
        "water_module_last_device_id",
        deviceId
      );

      // Verify it was actually stored
      const stored = await DeviceStorage.getLastDeviceId();
      expect(stored).toBe(deviceId);
    });

    it("overwrites existing device ID", async () => {
      await DeviceStorage.setLastDeviceId("first-device");
      await DeviceStorage.setLastDeviceId("second-device");

      const stored = await DeviceStorage.getLastDeviceId();
      expect(stored).toBe("second-device");
    });
  });

  describe("clearLastDeviceId", () => {
    it("removes the stored device ID", async () => {
      await DeviceStorage.setLastDeviceId("device-to-remove");
      expect(await DeviceStorage.getLastDeviceId()).toBe("device-to-remove");

      await DeviceStorage.clearLastDeviceId();
      expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith(
        "water_module_last_device_id"
      );

      const result = await DeviceStorage.getLastDeviceId();
      expect(result).toBeNull();
    });
  });
});
