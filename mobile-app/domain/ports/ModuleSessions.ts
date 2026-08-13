import type { ModuleDescriptor } from "@/domain/modules/ModuleDescriptor";
import type { DeviceHandle } from "@/domain/ports/DeviceHandle";
import type { DeviceInfo } from "@/domain/ports/DeviceRepository";

/** Owns the typed module systems, so the registry never names `WaterSystem` &co. */
export interface ModuleSessions {
  open(module: ModuleDescriptor, pairing: DeviceInfo): void;
  bind(module: ModuleDescriptor, device: DeviceHandle): void;
  /** Tolerates arriving twice in a row, or without a matching `bind`. */
  unbind(module: ModuleDescriptor): void;
  /** Tolerates arriving without a matching `open`. */
  close(module: ModuleDescriptor): void;
}
