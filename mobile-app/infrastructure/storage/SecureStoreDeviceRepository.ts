import * as SecureStore from "expo-secure-store";
import type {
  DeviceInfo,
  DeviceRepository,
  ModuleKey,
} from "@/domain/ports/DeviceRepository";

function getStorageKey(moduleKey: ModuleKey): string {
  return `${moduleKey}_module_last_device`;
}

/** Persists the last connected device in the device secure store. */
export class SecureStoreDeviceRepository implements DeviceRepository {
  async getLastDevice(moduleKey: ModuleKey): Promise<DeviceInfo | null> {
    const json = await SecureStore.getItemAsync(getStorageKey(moduleKey));
    if (!json) return null;
    try {
      return JSON.parse(json) as DeviceInfo;
    } catch {
      return null;
    }
  }

  async setLastDevice(device: DeviceInfo, moduleKey: ModuleKey): Promise<void> {
    await SecureStore.setItemAsync(
      getStorageKey(moduleKey),
      JSON.stringify(device),
    );
  }

  async clearLastDevice(moduleKey: ModuleKey): Promise<void> {
    await SecureStore.deleteItemAsync(getStorageKey(moduleKey));
  }
}
