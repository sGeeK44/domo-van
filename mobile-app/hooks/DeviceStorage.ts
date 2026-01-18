import * as SecureStore from "expo-secure-store";

/** Module keys for different BLE modules */
export type ModuleKey = "water" | "heater";

export type DeviceInfo = {
  id: string;
  name: string;
};

function getStorageKey(moduleKey: ModuleKey): string {
  return `${moduleKey}_module_last_device`;
}

/**
 * Service for persisting and retrieving the last connected device info.
 * Supports multiple modules via moduleKey parameter.
 * Extracted for testability.
 */
export const DeviceStorage = {
  async getLastDevice(moduleKey: ModuleKey = "water"): Promise<DeviceInfo | null> {
    const json = await SecureStore.getItemAsync(getStorageKey(moduleKey));
    if (!json) return null;
    try {
      return JSON.parse(json) as DeviceInfo;
    } catch {
      return null;
    }
  },

  async setLastDevice(device: DeviceInfo, moduleKey: ModuleKey = "water"): Promise<void> {
    await SecureStore.setItemAsync(getStorageKey(moduleKey), JSON.stringify(device));
  },

  async clearLastDevice(moduleKey: ModuleKey = "water"): Promise<void> {
    await SecureStore.deleteItemAsync(getStorageKey(moduleKey));
  },
};
