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
import { Channel } from "@/domain/ports/Channel";
import type { WriteOutcome } from "@/domain/SaveOutcome";
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
  private readonly writes: ConfirmedWrite;
  private channelUnsub: Unsubscribe | null = null;

  constructor(
    private readonly channel: Channel,
    now: () => number = sinceBoot,
  ) {
    this.writes = new ConfirmedWrite(this.channel, now);

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

  resync = (): Promise<void> => {
    this.writes.forgetOwedAcks();
    return this.getConfig();
  };

  /** The delay the countdown runs on only changes once the module says it kept it. */
  setAutoCloseTime = async (seconds: number): Promise<WriteOutcome> => {
    const outcome = await this.writes.send(`CFG:T=${seconds}`);
    if (outcome.status === "applied") {
      this.state.update((prev) => ({ ...prev, autoCloseSeconds: seconds }));
      return outcome;
    }
    const failure = unansweredWrite(outcome);
    if (failure) {
      this.state.update((prev) => ({ ...prev, lastFeedback: failure }));
    }
    return outcome;
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
    this.writes.dispose();
    this.channelUnsub?.();
    this.channelUnsub = null;
    this.state.destroy();
  };
}
