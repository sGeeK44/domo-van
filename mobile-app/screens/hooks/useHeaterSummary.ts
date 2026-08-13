import { useHeaterSystem } from "@/composition/ModuleSystemsProvider";
import { useObservable } from "@/core/react/useObservable";
import type { HeaterZoneSnapshot } from "@/domain/heater/HeaterZone";

export type HeaterSummary = {
  isRunning: boolean;
  setpointCelsius: number;
};

const IDLE_ZONE: HeaterZoneSnapshot = {
  temperatureCelsius: 0,
  setpointCelsius: 0,
  isRunning: false,
  pidConfig: null,
  lastMessage: null,
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
  const zone0 = useObservable(heater?.zones[0] ?? null, IDLE_ZONE);
  const zone1 = useObservable(heater?.zones[1] ?? null, IDLE_ZONE);
  const zone2 = useObservable(heater?.zones[2] ?? null, IDLE_ZONE);
  const zone3 = useObservable(heater?.zones[3] ?? null, IDLE_ZONE);

  return heaterSummary([zone0, zone1, zone2, zone3]);
}
