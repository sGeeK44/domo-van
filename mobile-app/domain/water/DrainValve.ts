import { Channel } from "@/core/bluetooth/Channel";
import {
  createObservable,
  Listener,
  Observable,
  Unsubscribe,
} from "@/core/observable";

export type ValvePosition = "open" | "closed" | "unknown";

export type ValveState = {
  position: ValvePosition;
  autoCloseSeconds: number;
  remainingSeconds: number;
  lastMessage: string | null;
};

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

export class DrainValve implements Observable<ValveState> {
  private readonly state = createObservable<ValveState>({
    position: "unknown",
    autoCloseSeconds: 30,
    remainingSeconds: 0,
    lastMessage: null,
  });
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
        lastMessage: "Erreur lors de la mise à jour",
      }));
    }
  };

  open = async () => {
    this.state.update((prev) => ({
      ...prev,
      position: "open",
      remainingSeconds: prev.autoCloseSeconds,
    }));
    try {
      await this.channel.send("OPEN");
    } catch {
      this.state.update((prev) => ({
        ...prev,
        position: "unknown",
        remainingSeconds: 0,
      }));
    }
  };

  close = async () => {
    this.state.update((prev) => ({
      ...prev,
      position: "closed",
      remainingSeconds: 0,
    }));
    try {
      await this.channel.send("CLOSE");
    } catch {
      this.state.update((prev) => ({
        ...prev,
        position: "unknown",
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
      }));
      return;
    }

    // Handle close messages
    if (msg === "CLOSED" || msg === "AUTO_CLOSED") {
      this.state.update((prev) => ({
        ...prev,
        position: "closed",
        remainingSeconds: 0,
      }));
      return;
    }

    // Handle OK response
    if (msg === "OK") {
      this.state.update((prev) => ({
        ...prev,
        lastMessage: "Configuration enregistrée",
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

    console.log("Unknown valve message:", msg);
  };

  dispose = () => {
    this.channelUnsub?.();
    this.channelUnsub = null;
    this.state.destroy();
  };
}
