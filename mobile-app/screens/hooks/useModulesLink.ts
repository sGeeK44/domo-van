import { useCallback } from "react";
import {
  useModuleRegistry,
  useModuleSlots,
} from "@/composition/ModuleRegistryProvider";
import type { StatusBadgeProps } from "@/design-system";
import type { ModuleSlot } from "@/domain/modules/ModuleSlot";

type ModulesLink = {
  status: StatusBadgeProps["status"];
  reconnectAll: () => void;
};

/** The header's view of every paired module, until #3 gives each slot its own dot. */
export function useModulesLink(): ModulesLink {
  const slots = useModuleSlots();
  const { reconnect } = useModuleRegistry();

  const reconnectAll = useCallback(() => {
    for (const slot of slots) {
      if (slot.pairing && slot.link.status === "offline") {
        void reconnect(slot.module.key);
      }
    }
  }, [slots, reconnect]);

  return { status: aggregateStatus(slots), reconnectAll };
}

function aggregateStatus(
  slots: readonly ModuleSlot[],
): StatusBadgeProps["status"] {
  const paired = slots.filter((slot) => slot.pairing !== null);
  if (paired.some((slot) => slot.link.status === "connecting"))
    return "loading";

  const online = paired.filter((slot) => slot.link.status === "online").length;
  if (paired.length > 0 && online === paired.length) return "connected";
  return online > 0 ? "partial" : "disconnected";
}
