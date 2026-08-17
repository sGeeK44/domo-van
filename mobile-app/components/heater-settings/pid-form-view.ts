import { ZONE_NAME_KEYS } from "@/components/heater/zone-names";
import type { PidConfig } from "@/domain/heater/HeaterProtocol";
import { PID_FIELDS, type ZoneGains } from "@/domain/heater/HeaterSystem";
import type { HeaterZoneSnapshot } from "@/domain/heater/HeaterZone";
import type { SaveFailure } from "@/domain/SaveOutcome";
import type { TranslationKey } from "@/i18n/keys";

export const ZONE_INDEXES = [0, 1, 2, 3] as const;
export type ZoneIndex = (typeof ZONE_INDEXES)[number];

export const GAINS = ["kp", "ki", "kd"] as const;
export type Gain = (typeof GAINS)[number];

export type GainKey = `${ZoneIndex}.${Gain}`;
export type PidFormValues = Record<GainKey, string>;
export type PidFormErrors = Partial<Record<GainKey, TranslationKey>>;

export const gainKey = (zone: ZoneIndex, gain: Gain): GainKey =>
  `${zone}.${gain}`;

const MIN_GAIN = 0.01;
const MAX_GAIN = 100;
/** The firmware carries gains ×100 as an integer, so two decimals is all a gain can hold. */
const GAIN_DECIMALS = 2;
const GAIN_SCALE = 100;

/** What the module reports, as text. A zone that has not answered yet shows nothing. */
export function pidValuesFrom(
  zones: readonly HeaterZoneSnapshot[],
): PidFormValues {
  const values = {} as PidFormValues;
  for (const zone of ZONE_INDEXES) {
    const config = zones[zone]?.pidConfig ?? null;
    for (const gain of GAINS) {
      values[gainKey(zone, gain)] =
        config === null ? "" : config[gain].toFixed(GAIN_DECIMALS);
    }
  }
  return values;
}

export function validatePidValues(values: PidFormValues): PidFormErrors {
  const errors: PidFormErrors = {};
  for (const zone of ZONE_INDEXES) {
    for (const gain of GAINS) {
      const key = gainKey(zone, gain);
      if (!isGainInRange(values[key])) errors[key] = "heater.pid.invalidGain";
    }
  }
  return errors;
}

export function zoneGainsFrom(values: PidFormValues): ZoneGains {
  const [first, second, third, fourth] = ZONE_INDEXES.map((zone) =>
    zoneConfigFrom(values, zone),
  ) as [PidConfig, PidConfig, PidConfig, PidConfig];
  return [first, second, third, fourth];
}

function zoneConfigFrom(values: PidFormValues, zone: ZoneIndex): PidConfig {
  return {
    kp: gainOf(values, zone, "kp"),
    ki: gainOf(values, zone, "ki"),
    kd: gainOf(values, zone, "kd"),
  };
}

/**
 * Quantized to what the wire carries. `HeaterZone` sends `round(gain * 100)`, so an unquantized
 * 0.015 would be stored as 0.02 and redisplayed as 0.01 — and the next press would send 0.01.
 */
function gainOf(values: PidFormValues, zone: ZoneIndex, gain: Gain): number {
  const typed = Number(values[gainKey(zone, gain)].trim());
  return Math.round(typed * GAIN_SCALE) / GAIN_SCALE;
}

/** Name and PIN aside, a PID failure is a zone — and the zone list is the same one both screens read. */
export function pidZoneName(failure: SaveFailure): TranslationKey {
  const zone = ZONE_INDEXES.find(
    (index) => failure.field === PID_FIELDS[index],
  );
  return zone === undefined
    ? "settings.save.fields.identity"
    : ZONE_NAME_KEYS[zone];
}

function isGainInRange(value: string): boolean {
  const trimmed = value.trim();
  if (!/^\d+(\.\d+)?$/.test(trimmed)) return false;

  const gain = Number(trimmed);
  return Number.isFinite(gain) && gain >= MIN_GAIN && gain <= MAX_GAIN;
}
