import type { HeaterReading } from "@/components/home/dashboard-cards";
import { useHeaterSystem } from "@/composition/ModuleSystemsProvider";
import { useObservable } from "@/core/react/useObservable";
import {
  DEFAULT_ZONE_SNAPSHOT,
  type HeaterZoneSnapshot,
} from "@/domain/heater/HeaterZone";

/** Salon, the zone the dashboard quotes (planning decision 5). */
const REFERENCE_ZONE_INDEX = 0;

/** What the dashboard says about the heater: whether it heats, and what its reference zone reads. */
export function heaterSummary(
  zones: readonly HeaterZoneSnapshot[],
): HeaterReading {
  return {
    isRunning: zones.some((zone) => zone.isRunning),
    referenceIndex: REFERENCE_ZONE_INDEX,
    reference: zones[REFERENCE_ZONE_INDEX] ?? DEFAULT_ZONE_SNAPSHOT,
  };
}

export function useHeaterSummary(): HeaterReading {
  const heater = useHeaterSystem();
  const zone0 = useObservable(heater?.zones[0] ?? null, DEFAULT_ZONE_SNAPSHOT);
  const zone1 = useObservable(heater?.zones[1] ?? null, DEFAULT_ZONE_SNAPSHOT);
  const zone2 = useObservable(heater?.zones[2] ?? null, DEFAULT_ZONE_SNAPSHOT);
  const zone3 = useObservable(heater?.zones[3] ?? null, DEFAULT_ZONE_SNAPSHOT);

  return heaterSummary([zone0, zone1, zone2, zone3]);
}
