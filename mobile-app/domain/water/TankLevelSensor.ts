import { Channel } from "@/core/bluetooth/Channel";
import { createObservable, Listener, Observable, Unsubscribe } from "@/core/observable";

export type TankConfig = {
  volumeLiters: number;
  heightMm: number;
};

export type TankTelemetry =
  | { type: "config"; config: TankConfig }
  | { type: "distance"; distanceMm: number };

export type TankLevelSnapshot = {
  capacityLiters: number;
  heightMm: number;
  percentage: number;
  lastDistanceMm: number | null;
  lastMessage: string | null;
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

export function parseTankConfigMessage(msg: string): TankConfig | null {
  const trimmed = msg.trim();
  if (!trimmed.startsWith("CFG:"))
    return null;
  const vMatch = /V=(\d+)/.exec(trimmed);
  const hMatch = /H=(\d+)/.exec(trimmed);
  if (!vMatch?.[1] || !hMatch?.[1])
    return null;

  const volumeLiters = Number(vMatch[1]);
  const heightMm = Number(hMatch[1]);
  if (!Number.isFinite(volumeLiters) || !Number.isFinite(heightMm))
    return null;
  return { volumeLiters, heightMm };
}

export function parseDistanceMessage(msg: string): number | null {
  const trimmed = msg.trim();
  if (!/^\d+$/.test(trimmed)) return null;
  const distanceMm = Number(trimmed);
  if (!Number.isFinite(distanceMm) || distanceMm < 0) return null;
  return distanceMm;
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

  private readonly state: ReturnType<typeof createObservable<TankLevelSnapshot>>;
  private channelUnsub: Unsubscribe | null = null;

  constructor(
    private readonly channel: Channel,
  ) {
    this.state = createObservable<TankLevelSnapshot>({
      capacityLiters: 0,
      heightMm: 0,
      percentage: 0,
      lastDistanceMm: null,
      lastMessage: null,
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
      if (cfg)
      {
        this.state.update((prev) => {
          return {
            ...prev,
            capacityLiters: cfg.volumeLiters,
            heightMm: cfg.heightMm,
            percentage: distanceToPercentage(prev.lastDistanceMm ?? 0, cfg.heightMm),
          };
        });
        return;
      }

      const distance = parseDistanceMessage(msg);
      if (distance != null)
      {
        this.state.update((prev) => {
          const percentage = distanceToPercentage(
                distance,
                prev.heightMm,
            );
          return {
            ...prev,
            percentage: percentage,
            lastDistanceMm: distance,
          };
        });
        return;
      }
      if (msg === "OK") {
        this.state.update((prev) => {
          return {
            ...prev,
            lastMessage: msg,
          };
        });
        return;
      }
      console.log("Unknown message:", msg);
    }

  dispose = () => {
    this.channelUnsub?.();
    this.channelUnsub = null;
    this.state.destroy();
  };
}
