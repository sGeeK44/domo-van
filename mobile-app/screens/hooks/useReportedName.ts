import { useState } from "react";
import { useModuleSlot } from "@/composition/ModuleRegistryProvider";
import type { ModuleKey } from "@/domain/modules/ModuleDescriptor";

export type ReportedName = { value: string; keep: (name: string) => void };

/**
 * The name the module answers to. A slot's `pairing` is written once, at pairing time, and no
 * reconnection refreshes it — so a name we saw the module accept is newer than the one it carries.
 */
export function useReportedName(moduleKey: ModuleKey): ReportedName {
  const paired = useModuleSlot(moduleKey).pairing?.name ?? "";
  const [written, setWritten] = useState<string | null>(null);

  return { value: written ?? paired, keep: setWritten };
}
