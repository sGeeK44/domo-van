import { Channel } from "@/core/bluetooth/Channel";
import { createObservable, Listener, Observable, Unsubscribe } from "@/core/observable";

export type HeaterZoneSnapshot = {
  temperatureCelsius: number;      // Current temperature (e.g., 22.5)
  setpointCelsius: number;         // Target temperature (e.g., 25.0)
  isRunning: boolean;              // Regulator active
  pidConfig: PidConfig | null;     // PID configuration
  lastMessage: string | null;      // Last feedback message
};

export type PidConfig = {
  kp: number;  // Proportional gain (real value, e.g., 10.0)
  ki: number;  // Integral gain (real value, e.g., 0.1)
  kd: number;  // Derivative gain (real value, e.g., 0.5)
};

/**
 * Parse STATUS response: STATUS:T=<temp×10>;SP=<setpoint×10>;RUN=<0|1>
 */
export function parseStatusMessage(msg: string): {
  temperatureCelsius: number;
  setpointCelsius: number;
  isRunning: boolean;
} | null {
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

/**
 * Parse setpoint response: SP:<celsius×10>
 */
export function parseSetpointMessage(msg: string): number | null {
  const trimmed = msg.trim();
  if (!trimmed.startsWith("SP:")) return null;

  const value = trimmed.substring(3);
  if (!/^\d+$/.test(value)) return null;

  const tenths = Number(value);
  if (!Number.isFinite(tenths)) return null;

  return tenths / 10;
}

/**
 * Parse PID config response: CFG:KP=<kp>;KI=<ki>;KD=<kd>
 * Values are stored as integers × 100
 */
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

  if (!Number.isFinite(kpRaw) || !Number.isFinite(kiRaw) || !Number.isFinite(kdRaw)) {
    return null;
  }

  return {
    kp: kpRaw / 100,
    ki: kiRaw / 100,
    kd: kdRaw / 100,
  };
}

export class HeaterZone implements Observable<HeaterZoneSnapshot> {
  private readonly state = createObservable<HeaterZoneSnapshot>({
    temperatureCelsius: 0,
    setpointCelsius: 20,
    isRunning: false,
    pidConfig: null,
    lastMessage: null,
  });
  private channelUnsub: Unsubscribe | null = null;
  private statusInterval: ReturnType<typeof setInterval> | null = null;

  constructor(
    private readonly channel: Channel,
    public readonly zoneIndex: number,
  ) {
    // Subscribe first, then request status
    this.channelUnsub = this.channel.listen(this.onMessageReceived);

    // Initial status request
    this.channel.send("STATUS?").catch(() => {
      // Best-effort: may fail when not connected yet
    });

    // Poll status every 2 seconds for live temperature updates
    this.statusInterval = setInterval(() => {
      this.channel.send("STATUS?").catch(() => {});
    }, 2000);
  }

  getValue = () => this.state.getValue();

  subscribe = (listener: Listener<HeaterZoneSnapshot>): Unsubscribe =>
    this.state.subscribe(listener);

  /** Request current status */
  getStatus = (): Promise<void> => this.channel.send("STATUS?");

  /** Request PID configuration */
  getPidConfig = (): Promise<void> => this.channel.send("CFG?");

  /** Request current setpoint */
  getSetpoint = (): Promise<void> => this.channel.send("SP?");

  /**
   * Set the target temperature
   * @param celsius Temperature in Celsius (e.g., 22.5)
   */
  setSetpoint = async (celsius: number): Promise<void> => {
    const tenths = Math.round(celsius * 10);
    // Clamp to valid range (0-50°C)
    const clamped = Math.max(0, Math.min(500, tenths));

    this.state.update((prev) => ({
      ...prev,
      setpointCelsius: clamped / 10,
    }));

    try {
      await this.channel.send(`SP:${clamped}`);
    } catch {
      this.state.update((prev) => ({
        ...prev,
        lastMessage: "Erreur lors de la mise à jour de la consigne",
      }));
    }
  };

  /** Start the heater regulator */
  start = async (): Promise<void> => {
    this.state.update((prev) => ({
      ...prev,
      isRunning: true,
    }));

    try {
      await this.channel.send("START");
    } catch {
      this.state.update((prev) => ({
        ...prev,
        isRunning: false,
        lastMessage: "Erreur lors du démarrage",
      }));
    }
  };

  /** Stop the heater regulator */
  stop = async (): Promise<void> => {
    this.state.update((prev) => ({
      ...prev,
      isRunning: false,
    }));

    try {
      await this.channel.send("STOP");
    } catch {
      this.state.update((prev) => ({
        ...prev,
        lastMessage: "Erreur lors de l'arrêt",
      }));
    }
  };

  /**
   * Set PID configuration
   * @param config PID gains (real values, will be multiplied by 100)
   */
  setPidConfig = async (config: PidConfig): Promise<void> => {
    const kpRaw = Math.round(config.kp * 100);
    const kiRaw = Math.round(config.ki * 100);
    const kdRaw = Math.round(config.kd * 100);

    this.state.update((prev) => ({
      ...prev,
      pidConfig: config,
    }));

    try {
      await this.channel.send(`CFG:KP=${kpRaw};KI=${kiRaw};KD=${kdRaw}`);
    } catch {
      this.state.update((prev) => ({
        ...prev,
        lastMessage: "Erreur lors de la configuration PID",
      }));
    }
  };

  private onMessageReceived = (msg: string) => {
    // Try parsing status response
    const status = parseStatusMessage(msg);
    if (status) {
      this.state.update((prev) => ({
        ...prev,
        temperatureCelsius: status.temperatureCelsius,
        setpointCelsius: status.setpointCelsius,
        isRunning: status.isRunning,
      }));
      return;
    }

    // Try parsing setpoint response
    const setpoint = parseSetpointMessage(msg);
    if (setpoint !== null) {
      this.state.update((prev) => ({
        ...prev,
        setpointCelsius: setpoint,
      }));
      return;
    }

    // Try parsing PID config response
    const pidConfig = parsePidConfigMessage(msg);
    if (pidConfig) {
      this.state.update((prev) => ({
        ...prev,
        pidConfig,
      }));
      return;
    }

    // Handle OK response
    if (msg.trim() === "OK") {
      this.state.update((prev) => ({
        ...prev,
        lastMessage: "OK",
      }));
      return;
    }

    // Handle error responses
    if (msg.startsWith("ERR_")) {
      this.state.update((prev) => ({
        ...prev,
        lastMessage: `Erreur: ${msg}`,
      }));
      return;
    }

    console.log(`[HeaterZone ${this.zoneIndex}] Unknown message:`, msg);
  };

  dispose = () => {
    if (this.statusInterval) {
      clearInterval(this.statusInterval);
      this.statusInterval = null;
    }
    this.channelUnsub?.();
    this.channelUnsub = null;
    this.state.destroy();
  };
}
