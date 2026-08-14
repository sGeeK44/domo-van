import type { EnvironmentSnapshot } from "@/domain/heater/EnvironmentData";
import type { TranslationKey } from "@/i18n/keys";

export type EnvironmentTile = {
  labelKey: TranslationKey;
  /** Already formatted, unit included: the strip computes nothing. */
  value: string;
};

const NO_READING = "-";
const DEGREE = "°";
const PERCENT = "%";

/** An offline heater holds constructor zeros, not measurements: never show them. */
export function environmentTiles(
  environment: EnvironmentSnapshot,
  online: boolean,
): readonly EnvironmentTile[] {
  const reading = (value: number, digits: number, unit: string) =>
    online ? `${value.toFixed(digits)}${unit}` : NO_READING;

  return [
    {
      labelKey: "dashboard.tiles.interior",
      value: reading(environment.temperatureCelsius, 1, DEGREE),
    },
    {
      labelKey: "dashboard.tiles.exterior",
      value: reading(environment.exteriorTemperatureCelsius, 1, DEGREE),
    },
    {
      labelKey: "dashboard.tiles.humidity",
      value: reading(environment.humidity, 0, PERCENT),
    },
    {
      labelKey: "dashboard.tiles.pressure",
      value: reading(environment.pressureHPa, 0, ""),
    },
  ];
}
