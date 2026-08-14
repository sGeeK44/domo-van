export const SETPOINT_STEP_CELSIUS = 0.5;
export const MIN_SETPOINT_CELSIUS = 5;
export const MAX_SETPOINT_CELSIUS = 30;

/** Living zones only; the rest switch off. Indexes follow ALL zone order. */
export const NIGHT_TARGETS_CELSIUS: Record<number, number> = { 0: 18, 1: 17 };

/** Targets live on the half-degree grid, inside the range the UI allows. */
export function snapSetpoint(celsius: number): number {
  const onGrid =
    Math.round(celsius / SETPOINT_STEP_CELSIUS) * SETPOINT_STEP_CELSIUS;
  return Math.min(MAX_SETPOINT_CELSIUS, Math.max(MIN_SETPOINT_CELSIUS, onGrid));
}

export function nightTargetCelsius(zoneIndex: number): number | null {
  return NIGHT_TARGETS_CELSIUS[zoneIndex] ?? null;
}

/** A zone bar spans 10–30 °C, inside the 5–30 °C its target is clamped to. */
const BAR_FLOOR_CELSIUS = 10;
const BAR_SPAN_CELSIUS = 20;

/** Where a temperature sits on a zone bar, 0 to 1: the mockup's `(t − 10) × 5` %. */
export function zoneRatio(celsius: number): number {
  const ratio = (celsius - BAR_FLOOR_CELSIUS) / BAR_SPAN_CELSIUS;
  return Math.min(1, Math.max(0, ratio));
}
