import * as SecureStore from "expo-secure-store";

const LAST_DEVICE_KEY = "water_module_last_device";

export type DeviceInfo = {
  id: string;
  name: string;
};

/**
 * Service for persisting and retrieving the last connected device info.
 * Extracted for testability.
 */
export const DeviceStorage = {
  async getLastDevice(): Promise<DeviceInfo | null> {
    const json = await SecureStore.getItemAsync(LAST_DEVICE_KEY);
    if (!json) return null;
    try {
      return JSON.parse(json) as DeviceInfo;
    } catch {
      return null;
    }
  },

  async setLastDevice(device: DeviceInfo): Promise<void> {
    await SecureStore.setItemAsync(LAST_DEVICE_KEY, JSON.stringify(device));
  },

  async clearLastDevice(): Promise<void> {
    await SecureStore.deleteItemAsync(LAST_DEVICE_KEY);
  },
};
