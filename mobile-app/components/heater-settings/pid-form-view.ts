import { ZONE_NAME_KEYS } from "@/components/heater/zone-names";
import type { PidConfig } from "@/domain/heater/HeaterProtocol";
import type { ZoneGains } from "@/domain/heater/HeaterSystem";
import type { HeaterZoneSnapshot } from "@/domain/heater/HeaterZone";
import type { SaveOutcome } from "@/domain/SaveOutcome";
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
    kp: Number(values[gainKey(zone, "kp")].trim()),
    ki: Number(values[gainKey(zone, "ki")].trim()),
    kd: Number(values[gainKey(zone, "kd")].trim()),
  };
}

/** What the save has to say, in keys — the screen owns the translating. */
export type PidSaveMessage = {
  key: TranslationKey;
  zone?: TranslationKey;
  code?: string;
};

/** A save reports the first thing that went wrong; the rest is in the module's own snapshot. */
export function pidSaveMessage(outcome: SaveOutcome): PidSaveMessage {
  if (outcome.status === "applied") return { key: "common.feedback.sent" };

  const failure = outcome.failures[0];
  if (!failure) return { key: "common.feedback.notAnswered" };

  const zone = zoneNameKeyOf(failure.field);
  if (failure.outcome.status === "rejected") {
    return { key: "heater.pid.rejected", zone, code: failure.outcome.code };
  }
  if (failure.outcome.status === "unreachable") {
    return { key: "common.feedback.unreachable", zone };
  }
  return { key: "heater.pid.notAnswered", zone };
}

function zoneNameKeyOf(field: string): TranslationKey | undefined {
  const zone = ZONE_INDEXES.find(
    (index) => field === `heater.pid.zone${index + 1}`,
  );
  return zone === undefined ? undefined : ZONE_NAME_KEYS[zone];
}

function isGainInRange(value: string): boolean {
  const trimmed = value.trim();
  if (!/^\d+(\.\d+)?$/.test(trimmed)) return false;

  const gain = Number(trimmed);
  return Number.isFinite(gain) && gain >= MIN_GAIN && gain <= MAX_GAIN;
}
