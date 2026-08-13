import type { ModuleDescriptor } from "@/domain/modules/ModuleDescriptor";
import type { DeviceHandle } from "@/domain/ports/DeviceHandle";
import type { DeviceInfo } from "@/domain/ports/DeviceRepository";

/** Owns the typed module systems, so the registry never names `WaterSystem` &co. */
export interface ModuleSessions {
  open(module: ModuleDescriptor, pairing: DeviceInfo): void;
  bind(module: ModuleDescriptor, device: DeviceHandle): void;
  unbind(module: ModuleDescriptor): void;
  close(module: ModuleDescriptor): void;
}
