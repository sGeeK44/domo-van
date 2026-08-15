import type { TranslationKey } from "@/i18n/keys";

/** One dictionary entry per zone, read by the piloting screen and the PID form alike. */
export const ZONE_NAME_KEYS = [
  "heater.zones.zone1",
  "heater.zones.zone2",
  "heater.zones.zone3",
  "heater.zones.zone4",
] as const satisfies readonly TranslationKey[];
