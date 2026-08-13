import { useCallback, useMemo } from "react";
import {
  useModuleRegistry,
  useModuleSlots,
} from "@/composition/ModuleRegistryProvider";
import {
  aggregateLinkStatus,
  type ModulesLinkStatus,
  reconnectableKeys,
} from "@/domain/modules/ModulesLink";

type ModulesLink = {
  status: ModulesLinkStatus;
  canReconnect: boolean;
  reconnectAll: () => void;
};

/** The header's view of every paired module, until #3 gives each slot its own dot. */
export function useModulesLink(): ModulesLink {
  const slots = useModuleSlots();
  const { reconnect } = useModuleRegistry();
  const reconnectable = useMemo(() => reconnectableKeys(slots), [slots]);

  const reconnectAll = useCallback(() => {
    for (const key of reconnectable) void reconnect(key);
  }, [reconnectable, reconnect]);

  return {
    status: aggregateLinkStatus(slots),
    canReconnect: reconnectable.length > 0,
    reconnectAll,
  };
}
