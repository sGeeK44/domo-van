export type PidConfig = {
  kp: number; // Proportional gain (real value, e.g., 10.0)
  ki: number; // Integral gain (real value, e.g., 0.1)
  kd: number; // Derivative gain (real value, e.g., 0.5)
};

export type HeaterStatus = {
  temperatureCelsius: number;
  setpointCelsius: number;
  isRunning: boolean;
};

export type EnvironmentReading = {
  temperatureCelsius: number;
  exteriorTemperatureCelsius: number;
  humidity: number;
  pressureHPa: number;
};

/** STATUS:T=<temp×10>;SP=<setpoint×10>;RUN=<0|1> */
export function parseStatusMessage(msg: string): HeaterStatus | null {
  const trimmed = msg.trim();
  if (!trimmed.startsWith("STATUS:")) return null;

  const tMatch = /T=(-?\d+)/.exec(trimmed);
  const spMatch = /SP=(\d+)/.exec(trimmed);
  const runMatch = /RUN=([01])/.exec(trimmed);

  if (!tMatch?.[1] || !spMatch?.[1] || !runMatch?.[1]) return null;

  const tempTenths = Number(tMatch[1]);
  const spTenths = Number(spMatch[1]);
  const run = runMatch[1];

  if (!Number.isFinite(tempTenths) || !Number.isFinite(spTenths)) return null;

  return {
    temperatureCelsius: tempTenths / 10,
    setpointCelsius: spTenths / 10,
    isRunning: run === "1",
  };
}

/** SP:<celsius×10> */
export function parseSetpointMessage(msg: string): number | null {
  const trimmed = msg.trim();
  if (!trimmed.startsWith("SP:")) return null;

  const value = trimmed.substring(3);
  if (!/^\d+$/.test(value)) return null;

  const tenths = Number(value);
  if (!Number.isFinite(tenths)) return null;

  return tenths / 10;
}

/** <name>:T=<temperature>, e.g. "heater_0:T=22.50" */
export function parseTemperatureNotification(msg: string): number | null {
  const trimmed = msg.trim();
  const match = /:T=(-?\d+(?:\.\d+)?)$/.exec(trimmed);
  if (!match?.[1]) return null;

  const temp = Number(match[1]);
  if (!Number.isFinite(temp)) return null;

  return temp;
}

/** CFG:KP=<kp×100>;KI=<ki×100>;KD=<kd×100> */
export function parsePidConfigMessage(msg: string): PidConfig | null {
  const trimmed = msg.trim();
  if (!trimmed.startsWith("CFG:")) return null;

  const kpMatch = /KP=(\d+)/.exec(trimmed);
  const kiMatch = /KI=(\d+)/.exec(trimmed);
  const kdMatch = /KD=(\d+)/.exec(trimmed);

  if (!kpMatch?.[1] || !kiMatch?.[1] || !kdMatch?.[1]) return null;

  const kpRaw = Number(kpMatch[1]);
  const kiRaw = Number(kiMatch[1]);
  const kdRaw = Number(kdMatch[1]);

  if (
    !Number.isFinite(kpRaw) ||
    !Number.isFinite(kiRaw) ||
    !Number.isFinite(kdRaw)
  ) {
    return null;
  }

  return {
    kp: kpRaw / 100,
    ki: kiRaw / 100,
    kd: kdRaw / 100,
  };
}

/** ENV:T=<temp×10>;H=<humidity×10>;P=<pressure×10>;EXT=<ext×10> */
export function parseEnvironmentMessage(
  msg: string,
): EnvironmentReading | null {
  const trimmed = msg.trim();
  if (!trimmed.startsWith("ENV:")) return null;

  const tMatch = /T=(-?\d+)/.exec(trimmed);
  const hMatch = /H=(\d+)/.exec(trimmed);
  const pMatch = /P=(\d+)/.exec(trimmed);
  const extMatch = /EXT=(-?\d+)/.exec(trimmed);

  if (!tMatch?.[1] || !hMatch?.[1] || !pMatch?.[1] || !extMatch?.[1])
    return null;

  const tempTenths = Number(tMatch[1]);
  const humidityTenths = Number(hMatch[1]);
  const pressureTenths = Number(pMatch[1]);
  const extTempTenths = Number(extMatch[1]);

  if (
    !Number.isFinite(tempTenths) ||
    !Number.isFinite(humidityTenths) ||
    !Number.isFinite(pressureTenths) ||
    !Number.isFinite(extTempTenths)
  ) {
    return null;
  }

  return {
    temperatureCelsius: tempTenths / 10,
    exteriorTemperatureCelsius: extTempTenths / 10,
    humidity: humidityTenths / 10,
    pressureHPa: pressureTenths / 10,
  };
}
