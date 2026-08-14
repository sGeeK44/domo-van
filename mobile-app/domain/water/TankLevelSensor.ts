import {
  createObservable,
  Listener,
  Observable,
  Unsubscribe,
} from "@/core/observable";
import { parseAckMessage } from "@/domain/AckMessage";
import { type Feedback, SAVED } from "@/domain/Feedback";
import { Channel } from "@/domain/ports/Channel";
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
  async setConfig(volumeLiters: string, heightMm: string): Promise<void> {
    const newVolume = Number(volumeLiters);
    const newHeight = Number(heightMm);
    this.state.update((prev) => {
      return {
        ...prev,
        capacityLiters: newVolume,
        heightMm: newHeight,
        percentage: distanceToPercentage(prev.lastDistanceMm ?? 0, newHeight),
      };
    });
    return this.channel.send(`CFG:V=${volumeLiters};H=${heightMm}`);
  }

  private readonly state: ReturnType<
    typeof createObservable<TankLevelSnapshot>
  >;
  private channelUnsub: Unsubscribe | null = null;

  constructor(private readonly channel: Channel) {
    this.state = createObservable<TankLevelSnapshot>({
      capacityLiters: 0,
      heightMm: 0,
      percentage: 0,
      lastDistanceMm: null,
      lastFeedback: null,
    });

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

  private onMessageReceived = (msg: string) => {
    const cfg = parseTankConfigMessage(msg);
    if (cfg) {
      this.state.update((prev) => {
        return {
          ...prev,
          capacityLiters: cfg.volumeLiters,
          heightMm: cfg.heightMm,
          percentage: distanceToPercentage(
            prev.lastDistanceMm ?? 0,
            cfg.heightMm,
          ),
        };
      });
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
    if (parseAckMessage(msg)?.type === "ok") {
      this.state.update((prev) => {
        return {
          ...prev,
          lastFeedback: SAVED,
        };
      });
      return;
    }
    console.log("Unknown message:", msg);
  };

  dispose = () => {
    this.channelUnsub?.();
    this.channelUnsub = null;
    this.state.destroy();
  };
}
