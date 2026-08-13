import { useMemo } from "react";
import {
  type ModuleTab,
  moduleTabs,
} from "@/components/navigation/module-tabs";
import { useModuleSlots } from "@/composition/ModuleRegistryProvider";

export function useModuleTabs(): readonly ModuleTab[] {
  const slots = useModuleSlots();
  return useMemo(() => moduleTabs(slots), [slots]);
}
