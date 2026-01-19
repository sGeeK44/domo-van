import { Channel } from "@/core/bluetooth/Channel";
import {
  createObservable,
  Listener,
  Observable,
  Unsubscribe,
} from "@/core/observable";

export type EnvironmentSnapshot = {
  temperatureCelsius: number; // Interior temperature (e.g., 22.5)
  exteriorTemperatureCelsius: number; // Exterior temperature (e.g., 12.0)
  humidity: number; // Relative humidity percentage (e.g., 45.0)
  pressureHPa: number; // Atmospheric pressure in hPa (e.g., 1013.2)
  lastMessage: string | null; // Last feedback message
};

/**
 * Parse ENV response: ENV:T=<temp×10>;H=<humidity×10>;P=<pressure×10>;EXT=<ext×10>
 */
export function parseEnvironmentMessage(msg: string): {
  temperatureCelsius: number;
  exteriorTemperatureCelsius: number;
  humidity: number;
  pressureHPa: number;
} | null {
  const trimmed = msg.trim();
  if (!trimmed.startsWith("ENV:")) return null;

  const tMatch = /T=(-?\d+)/.exec(trimmed);
  const hMatch = /H=(\d+)/.exec(trimmed);
  const pMatch = /P=(\d+)/.exec(trimmed);
  const extMatch = /EXT=(-?\d+)/.exec(trimmed);

  if (!tMatch?.[1] || !hMatch?.[1] || !pMatch?.[1] || !extMatch?.[1]) return null;

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

export class EnvironmentData implements Observable<EnvironmentSnapshot> {
  private readonly state = createObservable<EnvironmentSnapshot>({
    temperatureCelsius: 0,
    exteriorTemperatureCelsius: 0,
    humidity: 0,
    pressureHPa: 1013.25,
    lastMessage: null,
  });
  private channelUnsub: Unsubscribe | null = null;

  constructor(private readonly channel: Channel) {
    // Subscribe to receive environment notifications from the module
    this.channelUnsub = this.channel.listen(this.onMessageReceived);

    // Initial environment request (module will then push updates automatically)
    this.channel.send("ENV?").catch(() => {
      // Best-effort: may fail when not connected yet
    });
  }

  getValue = () => this.state.getValue();

  subscribe = (listener: Listener<EnvironmentSnapshot>): Unsubscribe =>
    this.state.subscribe(listener);

  /** Request current environment data */
  getEnvironment = (): Promise<void> => this.channel.send("ENV?");

  private onMessageReceived = (msg: string) => {
    // Try parsing environment response
    const env = parseEnvironmentMessage(msg);
    if (env) {
      this.state.update((prev) => ({
        ...prev,
        temperatureCelsius: env.temperatureCelsius,
        exteriorTemperatureCelsius: env.exteriorTemperatureCelsius,
        humidity: env.humidity,
        pressureHPa: env.pressureHPa,
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

    console.log("[EnvironmentData] Unknown message:", msg);
  };

  dispose = () => {
    this.channelUnsub?.();
    this.channelUnsub = null;
    this.state.destroy();
  };
}
