import {
  createObservable,
  Listener,
  Observable,
  Unsubscribe,
} from "@/core/observable";
import { parseAckMessage } from "@/domain/AckMessage";
import { ackFailure, type Feedback } from "@/domain/Feedback";
import { parseEnvironmentMessage } from "@/domain/heater/HeaterProtocol";
import { Channel } from "@/domain/ports/Channel";

export type EnvironmentSnapshot = {
  temperatureCelsius: number; // Interior temperature (e.g., 22.5)
  exteriorTemperatureCelsius: number; // Exterior temperature (e.g., 12.0)
  humidity: number; // Relative humidity percentage (e.g., 45.0)
  pressureHPa: number; // Atmospheric pressure in hPa (e.g., 1013.2)
  lastFeedback: Feedback | null; // Last outcome to show
};

/** What the strip reads as before the module has answered anything. */
export const DEFAULT_ENVIRONMENT: EnvironmentSnapshot = {
  temperatureCelsius: 0,
  exteriorTemperatureCelsius: 0,
  humidity: 0,
  pressureHPa: 1013.25,
  lastFeedback: null,
};

export class EnvironmentData implements Observable<EnvironmentSnapshot> {
  private readonly state =
    createObservable<EnvironmentSnapshot>(DEFAULT_ENVIRONMENT);
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

    const ack = parseAckMessage(msg);
    if (ack?.type === "error") {
      this.state.update((prev) => ({
        ...prev,
        lastFeedback: ackFailure(ack.code),
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
