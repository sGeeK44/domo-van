import type { ModuleKey } from "@/domain/modules/ModuleDescriptor";
import type {
  DeviceInfo,
  DeviceRepository,
} from "@/domain/ports/DeviceRepository";

/** Keeps pairings for one run only, so fake mode never touches the keystore. */
export class InMemoryDeviceRepository implements DeviceRepository {
  private readonly devices: Map<ModuleKey, DeviceInfo>;

  constructor(paired: Iterable<readonly [ModuleKey, DeviceInfo]> = []) {
    this.devices = new Map(paired);
  }

  async getLastDevice(moduleKey: ModuleKey): Promise<DeviceInfo | null> {
    return this.devices.get(moduleKey) ?? null;
  }

  async setLastDevice(device: DeviceInfo, moduleKey: ModuleKey): Promise<void> {
    this.devices.set(moduleKey, device);
  }

  async clearLastDevice(moduleKey: ModuleKey): Promise<void> {
    this.devices.delete(moduleKey);
  }
}
