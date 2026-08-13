import type { ModuleDescriptor } from "@/domain/modules/ModuleDescriptor";
import type { DeviceInfo } from "@/domain/ports/DeviceRepository";

export type LinkState =
  | { status: "offline"; lastContactAt: number | null }
  | { status: "connecting" }
  | { status: "online"; since: number };

/** A typed place in the van. `pairing === null` is the dashed placeholder. */
export type ModuleSlot = {
  module: ModuleDescriptor;
  pairing: DeviceInfo | null;
  link: LinkState;
};
