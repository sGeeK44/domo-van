import {
  createObservable,
  Listener,
  Observable,
  Unsubscribe,
} from "@/core/observable";
import { parseAckMessage } from "@/domain/AckMessage";
import { ackFailure, type Feedback, SAVED } from "@/domain/Feedback";
import { Channel } from "@/domain/ports/Channel";
import {
  parseCountdownMessage,
  parseValveConfigMessage,
} from "@/domain/water/WaterProtocol";

export type ValvePosition = "open" | "closed" | "unknown";

/** Who closed the valve: the user, or the module's own auto-close. */
export type ClosureCause = "manual" | "auto";

export type ValveState = {
  position: ValvePosition;
  autoCloseSeconds: number;
  remainingSeconds: number;
  lastClosure: ClosureCause | null;
  lastFeedback: Feedback | null;
};

/** What the valve reads as before the module has answered anything. */
export const DEFAULT_VALVE_STATE: ValveState = {
  position: "unknown",
  autoCloseSeconds: 30,
  remainingSeconds: 0,
  lastClosure: null,
  lastFeedback: null,
};

export class DrainValve implements Observable<ValveState> {
  private readonly state = createObservable<ValveState>(DEFAULT_VALVE_STATE);
  private channelUnsub: Unsubscribe | null = null;

  constructor(private readonly channel: Channel) {
    // Subscribe first, then request config
    this.channelUnsub = this.channel.listen(this.onMessageReceived);
    this.channel.send("CFG?").catch(() => {
      // Best-effort: config request may fail when not connected yet.
    });
  }

  getValue = () => this.state.getValue();

  subscribe = (listener: Listener<ValveState>): Unsubscribe =>
    this.state.subscribe(listener);

  getConfig = (): Promise<void> => {
    return this.channel.send("CFG?");
  };

  setAutoCloseTime = async (seconds: number): Promise<void> => {
    this.state.update((prev) => ({
      ...prev,
      autoCloseSeconds: seconds,
    }));
    try {
      await this.channel.send(`CFG:T=${seconds}`);
    } catch {
      // Revert on failure
      this.state.update((prev) => ({
        ...prev,
        lastFeedback: { key: "water.feedback.autoCloseFailed" },
      }));
    }
  };

  open = async () => {
    const closureBeforeWrite = this.state.getValue().lastClosure;
    this.state.update((prev) => ({
      ...prev,
      position: "open",
      remainingSeconds: prev.autoCloseSeconds,
      lastClosure: null,
    }));
    try {
      await this.channel.send("OPEN");
    } catch {
      this.state.update((prev) => ({
        ...prev,
        position: "unknown",
        remainingSeconds: 0,
        lastClosure: closureBeforeWrite,
        lastFeedback: { key: "water.feedback.openFailed" },
      }));
    }
  };

  close = async () => {
    const closureBeforeWrite = this.state.getValue().lastClosure;
    this.state.update((prev) => ({
      ...prev,
      position: "closed",
      remainingSeconds: 0,
      lastClosure: "manual",
    }));
    try {
      await this.channel.send("CLOSE");
    } catch {
      this.state.update((prev) => ({
        ...prev,
        position: "unknown",
        lastClosure: closureBeforeWrite,
        lastFeedback: { key: "water.feedback.closeFailed" },
      }));
    }
  };

  private onMessageReceived = (msg: string) => {
    // Try parsing config response
    const autoCloseSeconds = parseValveConfigMessage(msg);
    if (autoCloseSeconds !== null) {
      this.state.update((prev) => ({
        ...prev,
        autoCloseSeconds,
      }));
      return;
    }

    // Try parsing countdown
    const countdown = parseCountdownMessage(msg);
    if (countdown !== null) {
      this.state.update((prev) => ({
        ...prev,
        position: "open",
        remainingSeconds: countdown,
        lastClosure: null,
      }));
      return;
    }

    // Handle close messages
    if (msg === "CLOSED" || msg === "AUTO_CLOSED") {
      this.state.update((prev) => ({
        ...prev,
        position: "closed",
        remainingSeconds: 0,
        lastClosure: msg === "AUTO_CLOSED" ? "auto" : "manual",
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

    console.log("Unknown valve message:", msg);
  };

  dispose = () => {
    this.channelUnsub?.();
    this.channelUnsub = null;
    this.state.destroy();
  };
}
