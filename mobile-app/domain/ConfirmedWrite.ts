import { sinceBoot } from "@/core/clock";
import type { Unsubscribe } from "@/core/observable";
import { parseAckMessage } from "@/domain/AckMessage";
import { SerialQueue } from "@/domain/modules/SerialQueue";
import type { Channel } from "@/domain/ports/Channel";
import {
  APPLIED,
  rejectedWrite,
  TIMED_OUT,
  UNREACHABLE,
  type WriteOutcome,
} from "@/domain/SaveOutcome";

export const DEFAULT_WRITE_TIMEOUT_MS = 3_000;

/** How a channel answers "what do you hold?": the module echoes the very command that set the value. */
export type Readback = {
  probe: string;
  isReport: (frame: string) => boolean;
};

/** Every config channel reads back the same way — see {Tank,Valve,Heater}CfgProtocol.cpp. */
export const CONFIG_READBACK: Readback = {
  probe: "CFG?",
  isReport: (frame) => frame.trim().startsWith("CFG:"),
};

/** A delay measured on an injected clock, so a throttled timer cannot fire it early. */
class Deadline {
  private timer: ReturnType<typeof setTimeout> | null = null;

  constructor(
    private readonly now: () => number,
    private readonly onExpired: () => void,
  ) {}

  armFor(millis: number): void {
    this.wakeAt(this.now() + millis);
  }

  cancel(): void {
    if (this.timer !== null) clearTimeout(this.timer);
    this.timer = null;
  }

  private wakeAt(deadline: number): void {
    this.timer = setTimeout(() => {
      // a throttled timer wakes when it can; the clock decides whether the delay is over
      if (this.now() < deadline) {
        this.wakeAt(deadline);
        return;
      }
      this.onExpired();
    }, deadline - this.now());
  }
}

/** One frame we are waiting for, and what we conclude if it never comes. */
class PendingFrame {
  readonly outcome: Promise<WriteOutcome>;
  private readonly deadline: Deadline;
  private answer: (outcome: WriteOutcome) => void = () => {};
  private settled = false;

  constructor(
    now: () => number,
    private readonly onSettled: () => void,
  ) {
    this.deadline = new Deadline(now, () => this.settle(TIMED_OUT));
    this.outcome = new Promise<WriteOutcome>((resolve) => {
      this.answer = resolve;
    });
  }

  expireIn(millis: number): void {
    this.deadline.armFor(millis);
  }

  settle(outcome: WriteOutcome): void {
    if (this.settled) return;
    this.settled = true;
    this.deadline.cancel();
    this.onSettled();
    this.answer(outcome);
  }
}

type Verification = { pending: PendingFrame; command: string };

/** Sends on one channel and settles on the module's own answer, asking it what it holds when no answer comes. */
export class ConfirmedWrite {
  /** One write in flight: the module answers in order, and nothing else correlates an ack with its command. */
  private readonly queue = new SerialQueue();
  private readonly unlisten: Unsubscribe;
  private pending: PendingFrame | null = null;
  private verifying: Verification | null = null;
  private disposed = false;

  constructor(
    private readonly channel: Channel,
    private readonly readback: Readback | null = null,
    private readonly now: () => number = sinceBoot,
    private readonly timeoutMs: number = DEFAULT_WRITE_TIMEOUT_MS,
  ) {
    this.unlisten = channel.listen(this.onFrame);
  }

  /** Sends, settles on the next ack the channel emits, and falls back to the readback when none comes. */
  send(command: string): Promise<WriteOutcome> {
    return this.queue.run(() => this.sendNow(command));
  }

  dispose(): void {
    this.disposed = true;
    this.unlisten();
    this.pending?.settle(UNREACHABLE);
    this.verifying?.pending.settle(UNREACHABLE);
  }

  private async sendNow(command: string): Promise<WriteOutcome> {
    if (this.disposed) return UNREACHABLE;

    const acked = await this.awaitAck(command);
    if (acked.status !== "timedOut") return acked;
    return this.confirmByReadback(command);
  }

  private awaitAck(command: string): Promise<WriteOutcome> {
    // the ack can land inside send(), so the write is pending before it leaves
    const pending = new PendingFrame(this.now, () => {
      this.pending = null;
    });
    this.pending = pending;
    // the deadline covers the write itself: a GATT call that hangs must not hold the queue
    pending.expireIn(this.timeoutMs);
    void this.channel.send(command).catch(() => pending.settle(UNREACHABLE));

    return pending.outcome;
  }

  /** An ack is lost far more easily than a write: ask the module what it holds before calling the save failed. */
  private confirmByReadback(command: string): Promise<WriteOutcome> {
    const readback = this.readback;
    if (!readback || this.disposed) return Promise.resolve(TIMED_OUT);

    const pending = new PendingFrame(this.now, () => {
      this.verifying = null;
    });
    this.verifying = { pending, command };
    pending.expireIn(this.timeoutMs);
    void this.channel
      .send(readback.probe)
      .catch(() => pending.settle(TIMED_OUT));

    return pending.outcome;
  }

  private onFrame = (frame: string) => {
    if (this.takeReport(frame)) return;

    const ack = parseAckMessage(frame);
    if (!ack) return;
    this.pending?.settle(ack.type === "ok" ? APPLIED : rejectedWrite(ack.code));
  };

  /** A report is not an ack: it answers the probe, and only the write it echoes. */
  private takeReport(frame: string): boolean {
    const verifying = this.verifying;
    if (!verifying || !this.readback?.isReport(frame)) return false;

    const holdsWhatWeWrote = frame.trim() === verifying.command.trim();
    verifying.pending.settle(holdsWhatWeWrote ? APPLIED : TIMED_OUT);
    return true;
  }
}
