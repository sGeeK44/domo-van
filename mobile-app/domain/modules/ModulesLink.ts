import type { ModuleKey } from "@/domain/modules/ModuleDescriptor";
import type { ModuleSlot } from "@/domain/modules/ModuleSlot";

export type ModulesLinkStatus =
  | "loading"
  | "connected"
  | "partial"
  | "disconnected";

/** One status for every paired module, for a header that has a single dot to show. */
export function aggregateLinkStatus(
  slots: readonly ModuleSlot[],
): ModulesLinkStatus {
  const paired = pairedSlots(slots);
  if (paired.some((slot) => slot.link.status === "connecting"))
    return "loading";

  const online = paired.filter((slot) => slot.link.status === "online").length;
  if (paired.length > 0 && online === paired.length) return "connected";
  return online > 0 ? "partial" : "disconnected";
}

export function reconnectableKeys(
  slots: readonly ModuleSlot[],
): readonly ModuleKey[] {
  return pairedSlots(slots)
    .filter((slot) => slot.link.status === "offline")
    .map((slot) => slot.module.key);
}

function pairedSlots(slots: readonly ModuleSlot[]): readonly ModuleSlot[] {
  return slots.filter((slot) => slot.pairing !== null);
}
