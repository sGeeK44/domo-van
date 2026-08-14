/** What the tank has lost since the valve opened; a refill mid-drain never reads as a negative loss. */
export function drainedLiters(litersAtOpening: number, liters: number): number {
  return Math.max(0, litersAtOpening - liters);
}

/** The mockup's `15:44`: the time the drain started, not how long it has run. */
export function clockTime(at: Date): string {
  return `${twoDigits(at.getHours())}:${twoDigits(at.getMinutes())}`;
}

function twoDigits(value: number): string {
  return String(value).padStart(2, "0");
}
