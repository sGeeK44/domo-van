/**
 * Temperature color utilities for the heater dial.
 * Creates smooth gradient interpolation between temperature thresholds.
 */

// Color stops for temperature gradient
const COLOR_STOPS = [
  { temp: 14, color: { r: 66, g: 165, b: 245 } },   // Blue #42A5F5
  { temp: 19, color: { r: 255, g: 152, b: 0 } },    // Orange soft #FF9800
  { temp: 21, color: { r: 245, g: 124, b: 0 } },    // Orange dark #F57C00
  { temp: 25, color: { r: 229, g: 57, b: 53 } },    // Red vif #E53935
] as const;

// Gray color for OFF state
export const OFF_COLOR = "#555555";

/**
 * Linearly interpolate between two values
 */
function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/**
 * Interpolate between two RGB colors
 */
function lerpColor(
  c1: { r: number; g: number; b: number },
  c2: { r: number; g: number; b: number },
  t: number
): { r: number; g: number; b: number } {
  return {
    r: Math.round(lerp(c1.r, c2.r, t)),
    g: Math.round(lerp(c1.g, c2.g, t)),
    b: Math.round(lerp(c1.b, c2.b, t)),
  };
}

/**
 * Convert RGB object to hex string
 */
function rgbToHex(color: { r: number; g: number; b: number }): string {
  const toHex = (n: number) => n.toString(16).padStart(2, "0");
  return `#${toHex(color.r)}${toHex(color.g)}${toHex(color.b)}`.toUpperCase();
}

/**
 * Get the color for a given setpoint temperature.
 * Smoothly interpolates between color stops.
 *
 * @param setpoint - Temperature in Celsius
 * @param isRunning - Whether the heater is on (returns gray if off)
 * @returns Hex color string
 */
export function getTemperatureColor(
  setpoint: number,
  isRunning: boolean = true
): string {
  if (!isRunning) {
    return OFF_COLOR;
  }

  // Clamp and find the appropriate color stops
  if (setpoint <= COLOR_STOPS[0].temp) {
    return rgbToHex(COLOR_STOPS[0].color);
  }

  if (setpoint >= COLOR_STOPS[COLOR_STOPS.length - 1].temp) {
    return rgbToHex(COLOR_STOPS[COLOR_STOPS.length - 1].color);
  }

  // Find the two stops to interpolate between
  for (let i = 0; i < COLOR_STOPS.length - 1; i++) {
    const low = COLOR_STOPS[i];
    const high = COLOR_STOPS[i + 1];

    if (setpoint >= low.temp && setpoint <= high.temp) {
      const t = (setpoint - low.temp) / (high.temp - low.temp);
      return rgbToHex(lerpColor(low.color, high.color, t));
    }
  }

  // Fallback (should never reach here)
  return rgbToHex(COLOR_STOPS[0].color);
}

/**
 * Get a slightly dimmed version of the temperature color for background arcs
 */
export function getTemperatureColorDimmed(
  setpoint: number,
  isRunning: boolean = true
): string {
  if (!isRunning) {
    return "#333333";
  }

  const hex = getTemperatureColor(setpoint, isRunning);
  // Parse hex and dim by 70%
  const r = Math.round(parseInt(hex.slice(1, 3), 16) * 0.3);
  const g = Math.round(parseInt(hex.slice(3, 5), 16) * 0.3);
  const b = Math.round(parseInt(hex.slice(5, 7), 16) * 0.3);

  return rgbToHex({ r, g, b });
}

// Temperature bounds for the dial
export const MIN_TEMP = 10;
export const MAX_TEMP = 30;
export const TEMP_STEP = 0.5;
