import { sinceBoot } from "@/core/clock";
import {
  createObservable,
  Listener,
  Observable,
  Unsubscribe,
} from "@/core/observable";
import { parseAckMessage } from "@/domain/AckMessage";
import { CONFIG_READBACK, ConfirmedWrite } from "@/domain/ConfirmedWrite";
import {
  ackFailure,
  type Feedback,
  SAVED,
  unansweredWrite,
} from "@/domain/Feedback";
import { Channel } from "@/domain/ports/Channel";
import type { WriteOutcome } from "@/domain/SaveOutcome";
import {
  parseDistanceMessage,
  parseTankConfigMessage,
  TankConfig,
} from "@/domain/water/WaterProtocol";

export type TankTelemetry =
  | { type: "config"; config: TankConfig }
  | { type: "distance"; distanceMm: number };

export type TankLevelSnapshot = {
  capacityLiters: number;
  heightMm: number;
  percentage: number;
  lastDistanceMm: number | null;
  lastFeedback: Feedback | null;
};

/** What a tank reads as before the module has answered anything. */
export const DEFAULT_TANK_SNAPSHOT: TankLevelSnapshot = {
  capacityLiters: 0,
  heightMm: 0,
  percentage: 0,
  lastDistanceMm: null,
  lastFeedback: null,
};

export function clamp01(n: number): number {
  return Math.max(0, Math.min(1, n));
}

export function distanceToPercentage(
  distanceMm: number,
  heightMm: number,
): number {
  if (
    !Number.isFinite(distanceMm) ||
    !Number.isFinite(heightMm) ||
    heightMm <= 0
  ) {
    return 0;
  }
  const ratio = clamp01(1 - distanceMm / heightMm);
  return ratio * 100;
}

export class TankLevelSensor implements Observable<TankLevelSnapshot> {
  setConfig(volumeLiters: string, heightMm: string): Promise<WriteOutcome> {
    return this.saveConfig({
      volumeLiters: Number(volumeLiters),
      heightMm: Number(heightMm),
    });
  }

  /** The snapshot only takes the new config once the module says it kept it. */
  async saveConfig(config: TankConfig): Promise<WriteOutcome> {
    const outcome = await this.writes.send(
      `CFG:V=${config.volumeLiters};H=${config.heightMm}`,
    );
    if (outcome.status === "applied") this.applyConfig(config);
    this.report(outcome);
    return outcome;
  }

  /** The snapshot says what the write reported: a refusal already came in as a frame. */
  private report(outcome: WriteOutcome): void {
    const feedback =
      outcome.status === "applied" ? SAVED : unansweredWrite(outcome);
    if (!feedback) return;
    this.state.update((prev) => ({ ...prev, lastFeedback: feedback }));
  }

  private readonly state: ReturnType<
    typeof createObservable<TankLevelSnapshot>
  >;
  private readonly writes: ConfirmedWrite;
  private channelUnsub: Unsubscribe | null = null;

  constructor(
    private readonly channel: Channel,
    now: () => number = sinceBoot,
  ) {
    this.state = createObservable<TankLevelSnapshot>(DEFAULT_TANK_SNAPSHOT);
    this.writes = new ConfirmedWrite(this.channel, CONFIG_READBACK, now);

    // Subscribe first, then request config (so the response is not missed).
    this.channelUnsub = this.channel.listen(this.onMessageReceived);
    this.channel.send("CFG?").catch(() => {
      // Best-effort: config request may fail when not connected yet.
    });
  }

  getValue = () => this.state.getValue();

  getConfig(): Promise<void> {
    return this.channel.send("CFG?");
  }

  subscribe = (listener: Listener<TankLevelSnapshot>): Unsubscribe => {
    return this.state.subscribe(listener);
  };

  private applyConfig(config: TankConfig): void {
    this.state.update((prev) => {
      return {
        ...prev,
        capacityLiters: config.volumeLiters,
        heightMm: config.heightMm,
        percentage: distanceToPercentage(
          prev.lastDistanceMm ?? 0,
          config.heightMm,
        ),
      };
    });
  }

  private onMessageReceived = (msg: string) => {
    const cfg = parseTankConfigMessage(msg);
    if (cfg) {
      this.applyConfig(cfg);
      return;
    }

    const distance = parseDistanceMessage(msg);
    if (distance != null) {
      this.state.update((prev) => {
        const percentage = distanceToPercentage(distance, prev.heightMm);
        return {
          ...prev,
          percentage: percentage,
          lastDistanceMm: distance,
        };
      });
      return;
    }
    const ack = parseAckMessage(msg);
    if (ack) {
      // success is the write's to claim, not a stray OK's
      if (ack.type === "error") {
        this.state.update((prev) => ({
          ...prev,
          lastFeedback: ackFailure(ack.code),
        }));
      }
      return;
    }
    console.log("Unknown message:", msg);
  };

  dispose = () => {
    this.writes.dispose();
    this.channelUnsub?.();
    this.channelUnsub = null;
    this.state.destroy();
  };
}
