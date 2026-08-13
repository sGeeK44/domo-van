import {
  createContext,
  type PropsWithChildren,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useContainer } from "@/composition/ContainerProvider";
import type { Container } from "@/composition/createContainer";
import { ModuleSystemSessions } from "@/composition/ModuleSessions";
import { useObservable } from "@/core/react/useObservable";
import type { ModuleKey } from "@/domain/modules/ModuleDescriptor";
import { ModuleRegistry } from "@/domain/modules/ModuleRegistry";
import type { ModuleSlot } from "@/domain/modules/ModuleSlot";
import type { DiscoveredBluetoothDevice } from "@/domain/ports/BluetoothScanner";

export type ModuleRegistryActions = {
  pair: (key: ModuleKey, device: DiscoveredBluetoothDevice) => Promise<void>;
  unpair: (key: ModuleKey) => Promise<void>;
  reconnect: (key: ModuleKey) => Promise<void>;
};

type ModuleRegistryValue = {
  registry: ModuleRegistry;
  sessions: ModuleSystemSessions;
};

const NO_SLOTS: readonly ModuleSlot[] = [];

const ModuleRegistryContext = createContext<ModuleRegistryValue | null>(null);

/** Owns the registry for the app's lifetime: pairings, slots and the systems behind them. */
export function ModuleRegistryProvider({ children }: PropsWithChildren) {
  const container = useContainer();
  const [value] = useState(() => createRegistry(container));

  useEffect(() => {
    void value.registry.start();
    return () => value.registry.dispose();
  }, [value]);

  return (
    <ModuleRegistryContext.Provider value={value}>
      {children}
    </ModuleRegistryContext.Provider>
  );
}

function createRegistry(container: Container): ModuleRegistryValue {
  const sessions = new ModuleSystemSessions(container.transports);
  return {
    sessions,
    registry: new ModuleRegistry({
      repository: container.deviceRepository,
      connector: container.bluetooth,
      sessions,
    }),
  };
}

export function useModuleSlots(): readonly ModuleSlot[] {
  return useObservable(useModuleRegistryValue().registry, NO_SLOTS);
}

export function useModuleSlot(key: ModuleKey): ModuleSlot {
  const slot = useModuleSlots().find(
    (candidate) => candidate.module.key === key,
  );
  if (!slot) throw new Error(`Unknown module "${key}"`);
  return slot;
}

export function useModuleRegistry(): ModuleRegistryActions {
  const { registry } = useModuleRegistryValue();

  return useMemo(
    () => ({
      pair: (key: ModuleKey, device: DiscoveredBluetoothDevice) =>
        registry.pair(key, device),
      unpair: (key: ModuleKey) => registry.unpair(key),
      reconnect: (key: ModuleKey) => registry.reconnect(key),
    }),
    [registry],
  );
}

export function useModuleSessions(): ModuleSystemSessions {
  return useModuleRegistryValue().sessions;
}

function useModuleRegistryValue(): ModuleRegistryValue {
  const ctx = useContext(ModuleRegistryContext);
  if (!ctx) {
    throw new Error(
      "useModuleRegistry must be used within a ModuleRegistryProvider",
    );
  }
  return ctx;
}
