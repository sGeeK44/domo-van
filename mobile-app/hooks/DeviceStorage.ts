import * as SecureStore from "expo-secure-store";

const LAST_DEVICE_ID_KEY = "water_module_last_device_id";

/**
 * Service for persisting and retrieving the last connected device ID.
 * Extracted for testability.
 */
export const DeviceStorage = {
  async getLastDeviceId(): Promise<string | null> {
    return SecureStore.getItemAsync(LAST_DEVICE_ID_KEY);
  },

  async setLastDeviceId(deviceId: string): Promise<void> {
    await SecureStore.setItemAsync(LAST_DEVICE_ID_KEY, deviceId);
  },

  async clearLastDeviceId(): Promise<void> {
    await SecureStore.deleteItemAsync(LAST_DEVICE_ID_KEY);
  },
};
