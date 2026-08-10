/** Module keys for different BLE modules */
export type ModuleKey = "water" | "heater" | "battery";

export type DeviceInfo = {
  id: string;
  name: string;
};

/**
 * Remembers which device a module was last paired with, so the app can
 * reconnect without asking the user to scan again.
 */
export interface DeviceRepository {
  getLastDevice(moduleKey: ModuleKey): Promise<DeviceInfo | null>;
  setLastDevice(device: DeviceInfo, moduleKey: ModuleKey): Promise<void>;
  clearLastDevice(moduleKey: ModuleKey): Promise<void>;
}
