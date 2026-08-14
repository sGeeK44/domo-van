import { useHeaterSystem } from "@/composition/ModuleSystemsProvider";
import { useObservable } from "@/core/react/useObservable";
import {
  DEFAULT_ZONE_SNAPSHOT,
  type HeaterZoneSnapshot,
} from "@/domain/heater/HeaterZone";

export type HeaterSummary = {
  isRunning: boolean;
  setpointCelsius: number;
};

/** What the dashboard says about the heater: heating, and up to which setpoint. */
export function heaterSummary(
  zones: readonly HeaterZoneSnapshot[],
): HeaterSummary {
  const running = zones.filter((zone) => zone.isRunning);
  return {
    isRunning: running.length > 0,
    setpointCelsius: running.reduce(
      (warmest, zone) => Math.max(warmest, zone.setpointCelsius),
      0,
    ),
  };
}

export function useHeaterSummary(): HeaterSummary {
  const heater = useHeaterSystem();
  const zone0 = useObservable(heater?.zones[0] ?? null, DEFAULT_ZONE_SNAPSHOT);
  const zone1 = useObservable(heater?.zones[1] ?? null, DEFAULT_ZONE_SNAPSHOT);
  const zone2 = useObservable(heater?.zones[2] ?? null, DEFAULT_ZONE_SNAPSHOT);
  const zone3 = useObservable(heater?.zones[3] ?? null, DEFAULT_ZONE_SNAPSHOT);

  return heaterSummary([zone0, zone1, zone2, zone3]);
}
