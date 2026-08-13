import { createFanout, type Source } from "@/core/fanout";
import type { Listener, Unsubscribe } from "@/core/observable";
import { buildReadAllCommand } from "@/domain/battery/JkBmsProtocol";
import type { BinaryTransport } from "@/domain/ports/BinaryTransport";
import { JK_BMS_CORPUS } from "./scenarios/jkBmsFrames";

export type FakeBinaryTransportOptions = {
  /** Frames to replay, in order. Pass `[]` to drive the transport by hand. */
  frames?: readonly Uint8Array[];
  /** Cadence of the unsolicited replay, since telemetry is BMS-initiated. */
  intervalMs?: number;
};

/** Replays a recorded corpus, so a screen runs with no radio in the room. */
export class FakeBinaryTransport implements BinaryTransport {
  private readonly notifications = createFanout<Uint8Array>(() =>
    this.startTicking(),
  );
  private readonly frames: readonly Uint8Array[];
  private readonly intervalMs: number;
  readonly sent: Uint8Array[] = [];

  constructor(options: FakeBinaryTransportOptions = {}) {
    this.frames = options.frames ?? JK_BMS_CORPUS;
    this.intervalMs = options.intervalMs ?? 0;
  }

  get listenerCount(): number {
    return this.notifications.size;
  }

  listen(onBytes: Listener<Uint8Array>): Unsubscribe {
    const stop = this.notifications.add(onBytes);
    this.replay();
    return stop;
  }

  send(bytes: Uint8Array): Promise<void> {
    this.sent.push(bytes);
    if (isReadAllCommand(bytes)) {
      this.replay();
    }
    return Promise.resolve();
  }

  replay(): void {
    for (const frame of this.frames) {
      this.emit(frame);
    }
  }

  /** Pushes a chunk as a notification would, frame boundaries or not. */
  emit(bytes: Uint8Array | readonly number[]): void {
    this.notifications.emit(
      bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes),
    );
  }

  private startTicking(): Source {
    if (this.intervalMs <= 0) return { remove: () => {} };

    const ticker = setInterval(() => this.replay(), this.intervalMs);
    return { remove: () => clearInterval(ticker) };
  }
}

function isReadAllCommand(bytes: Uint8Array): boolean {
  const readAll = buildReadAllCommand();
  return (
    bytes.length === readAll.length &&
    readAll.every((byte, index) => byte === bytes[index])
  );
}
