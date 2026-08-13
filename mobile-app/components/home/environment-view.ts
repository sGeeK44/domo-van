import type { EnvironmentSnapshot } from "@/domain/heater/EnvironmentData";

export type EnvironmentReadings = {
  topLeft: { icon: "home"; value: string };
  topRight: { icon: "water-drop"; value: string };
  bottomLeft: { icon: "park"; value: string };
  bottomRight: { icon: "speed"; value: string };
};

const NO_READING = "-";

/** An offline heater holds constructor zeros, not measurements: never show them. */
export function environmentReadings(
  environment: EnvironmentSnapshot,
  online: boolean,
): EnvironmentReadings {
  const reading = (value: number, digits: number, unit: string) =>
    online ? `${value.toFixed(digits)}${unit}` : NO_READING;

  return {
    topLeft: {
      icon: "home",
      value: reading(environment.temperatureCelsius, 1, "°C"),
    },
    topRight: {
      icon: "water-drop",
      value: reading(environment.humidity, 0, "%"),
    },
    bottomLeft: {
      icon: "park",
      value: reading(environment.exteriorTemperatureCelsius, 1, "°C"),
    },
    bottomRight: {
      icon: "speed",
      value: reading(environment.pressureHPa, 0, " hPa"),
    },
  };
}
