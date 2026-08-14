export const SETPOINT_STEP_CELSIUS = 0.5;
export const MIN_SETPOINT_CELSIUS = 5;
export const MAX_SETPOINT_CELSIUS = 30;

/** Living zones only; the rest switch off. Indexes follow ALL zone order. */
export const NIGHT_TARGETS_CELSIUS: Record<number, number> = { 0: 18, 1: 17 };

export function clampSetpoint(celsius: number): number {
  return Math.min(
    MAX_SETPOINT_CELSIUS,
    Math.max(MIN_SETPOINT_CELSIUS, celsius),
  );
}

export function nightTargetCelsius(zoneIndex: number): number | null {
  return NIGHT_TARGETS_CELSIUS[zoneIndex] ?? null;
}
