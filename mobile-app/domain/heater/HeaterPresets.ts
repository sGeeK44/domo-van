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
