import type { ModuleDescriptor } from "@/domain/modules/ModuleDescriptor";
import type { DeviceInfo } from "@/domain/ports/DeviceRepository";

export type LinkState =
  | { status: "offline"; lastContactAt: number | null }
  | { status: "connecting" }
  | { status: "online"; since: number };

export type ModuleSlot = {
  module: ModuleDescriptor;
  pairing: DeviceInfo | null;
  link: LinkState;
};
