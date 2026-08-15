import { sinceBoot } from "@/core/clock";
import {
  createObservable,
  Listener,
  Observable,
  Unsubscribe,
} from "@/core/observable";
import { parseAckMessage } from "@/domain/AckMessage";
import { ConfirmedWrite } from "@/domain/ConfirmedWrite";
import {
  ackFailure,
  type Feedback,
  SAVED,
  unansweredWrite,
} from "@/domain/Feedback";
import {
  PidConfig,
  parsePidConfigMessage,
  parseSetpointMessage,
  parseStatusMessage,
  parseTemperatureNotification,
} from "@/domain/heater/HeaterProtocol";
import { Channel } from "@/domain/ports/Channel";
import type { WriteOutcome } from "@/domain/SaveOutcome";

export type HeaterZoneSnapshot = {
  temperatureCelsius: number; // Current temperature (e.g., 22.5)
  setpointCelsius: number; // Target temperature (e.g., 25.0)
  isRunning: boolean; // Regulator active
  pidConfig: PidConfig | null; // PID configuration
  lastFeedback: Feedback | null; // Last outcome to show
};

/** What a zone reads as before the module has answered anything. */
export const DEFAULT_ZONE_SNAPSHOT: HeaterZoneSnapshot = {
  temperatureCelsius: 0,
  setpointCelsius: 20,
  isRunning: false,
  pidConfig: null,
  lastFeedback: null,
};

export class HeaterZone implements Observable<HeaterZoneSnapshot> {
  private readonly state = createObservable<HeaterZoneSnapshot>(
    DEFAULT_ZONE_SNAPSHOT,
  );
  private readonly writes: ConfirmedWrite;
  private channelUnsub: Unsubscribe | null = null;

  constructor(
    private readonly channel: Channel,
    public readonly zoneIndex: number,
    now: () => number = sinceBoot,
  ) {
    this.writes = new ConfirmedWrite(this.channel, now);

    // Subscribe to receive status notifications from the module
    this.channelUnsub = this.channel.listen(this.onMessageReceived);

    // Initial status request (module will then push updates automatically)
    this.channel.send("STATUS?").catch(() => {
      // Best-effort: may fail when not connected yet
    });
  }

  getValue = () => this.state.getValue();

  subscribe = (listener: Listener<HeaterZoneSnapshot>): Unsubscribe =>
    this.state.subscribe(listener);

  /** Request current status */
  getStatus = (): Promise<void> => this.channel.send("STATUS?");

  /** Request PID configuration */
  getPidConfig = (): Promise<void> => this.channel.send("CFG?");

  resync = (): void => this.writes.forgetOwedAcks();

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
        lastFeedback: { key: "heater.feedback.setpointFailed" },
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
        lastFeedback: { key: "heater.feedback.startFailed" },
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
        lastFeedback: { key: "heater.feedback.stopFailed" },
      }));
    }
  };

  /** Gains travel ×100, and the snapshot only takes them once the module says it kept them. */
  setPidConfig = async (config: PidConfig): Promise<WriteOutcome> => {
    const kpRaw = Math.round(config.kp * 100);
    const kiRaw = Math.round(config.ki * 100);
    const kdRaw = Math.round(config.kd * 100);

    const outcome = await this.writes.send(
      `CFG:KP=${kpRaw};KI=${kiRaw};KD=${kdRaw}`,
    );
    if (outcome.status === "applied") {
      this.state.update((prev) => ({ ...prev, pidConfig: config }));
      return outcome;
    }
    const failure = unansweredWrite(outcome);
    if (failure) {
      this.state.update((prev) => ({ ...prev, lastFeedback: failure }));
    }
    return outcome;
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

    // Try parsing temperature notification (e.g., "heater_0:T=22.50")
    const temp = parseTemperatureNotification(msg);
    if (temp !== null) {
      this.state.update((prev) => ({
        ...prev,
        temperatureCelsius: temp,
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

    const ack = parseAckMessage(msg);
    if (ack) {
      this.state.update((prev) => ({
        ...prev,
        lastFeedback: ack.type === "ok" ? SAVED : ackFailure(ack.code),
      }));
      return;
    }

    console.log(`[HeaterZone ${this.zoneIndex}] Unknown message:`, msg);
  };

  dispose = () => {
    this.writes.dispose();
    this.channelUnsub?.();
    this.channelUnsub = null;
    this.state.destroy();
  };
}
