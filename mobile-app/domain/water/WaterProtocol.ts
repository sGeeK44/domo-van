export type TankConfig = {
  volumeLiters: number;
  heightMm: number;
};

export function parseTankConfigMessage(msg: string): TankConfig | null {
  const trimmed = msg.trim();
  if (!trimmed.startsWith("CFG:")) return null;
  const vMatch = /V=(\d+)/.exec(trimmed);
  const hMatch = /H=(\d+)/.exec(trimmed);
  if (!vMatch?.[1] || !hMatch?.[1]) return null;

  const volumeLiters = Number(vMatch[1]);
  const heightMm = Number(hMatch[1]);
  if (!Number.isFinite(volumeLiters) || !Number.isFinite(heightMm)) return null;
  return { volumeLiters, heightMm };
}

export function parseDistanceMessage(msg: string): number | null {
  const trimmed = msg.trim();
  if (!/^\d+$/.test(trimmed)) return null;
  const distanceMm = Number(trimmed);
  if (!Number.isFinite(distanceMm) || distanceMm < 0) return null;
  return distanceMm;
}

export function parseValveConfigMessage(msg: string): number | null {
  const trimmed = msg.trim();
  if (!trimmed.startsWith("CFG:")) return null;
  const tMatch = /T=(\d+)/.exec(trimmed);
  if (!tMatch?.[1]) return null;

  const autoCloseSeconds = Number(tMatch[1]);
  if (!Number.isFinite(autoCloseSeconds)) return null;
  return autoCloseSeconds;
}

export function parseCountdownMessage(msg: string): number | null {
  const trimmed = msg.trim();
  if (!trimmed.startsWith("COUNTDOWN:")) return null;
  const value = trimmed.substring("COUNTDOWN:".length);
  if (!/^\d+$/.test(value)) return null;
  const seconds = Number(value);
  if (!Number.isFinite(seconds) || seconds < 0) return null;
  return seconds;
}
