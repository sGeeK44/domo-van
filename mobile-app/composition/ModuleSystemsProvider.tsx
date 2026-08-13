import { useModuleSessions } from "@/composition/ModuleRegistryProvider";
import {
  type LiveModuleSystems,
  NO_MODULE_SYSTEMS,
} from "@/composition/ModuleSessions";
import { useObservable } from "@/core/react/useObservable";
import type { BatterySystem } from "@/domain/battery/BatterySystem";
import type { HeaterSystem } from "@/domain/heater/HeaterSystem";
import type { WaterSystem } from "@/domain/water/WaterSystem";

/** One instance per pairing, so every screen reading the same module reads the same object. */
function useModuleSystems(): LiveModuleSystems {
  return useObservable(useModuleSessions().systems, NO_MODULE_SYSTEMS);
}

export function useWaterSystem(): WaterSystem | null {
  return useModuleSystems().water;
}

export function useHeaterSystem(): HeaterSystem | null {
  return useModuleSystems().heater;
}

export function useBatterySystem(): BatterySystem | null {
  return useModuleSystems().battery;
}
