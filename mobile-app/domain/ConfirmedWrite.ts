import type { Unsubscribe } from "@/core/observable";
import { parseAckMessage } from "@/domain/AckMessage";
import { SerialQueue } from "@/domain/modules/SerialQueue";
import type { Channel } from "@/domain/ports/Channel";
import {
  APPLIED,
  rejectedWrite,
  TIMED_OUT,
  type WriteOutcome,
} from "@/domain/SaveOutcome";

export const DEFAULT_WRITE_TIMEOUT_MS = 3_000;

/** One command waiting for the answer the module owes it. */
class PendingAck {
  readonly outcome: Promise<WriteOutcome>;
  private answer: (outcome: WriteOutcome) => void = () => {};
  private timer: ReturnType<typeof setTimeout> | null = null;
  private settled = false;

  constructor(
    private readonly now: () => number,
    private readonly onSettled: () => void,
  ) {
    this.outcome = new Promise<WriteOutcome>((resolve) => {
      this.answer = resolve;
    });
  }

  settle(outcome: WriteOutcome): void {
    if (this.settled) return;
    this.settled = true;
    this.clearTimer();
    this.onSettled();
    this.answer(outcome);
  }

  expireAt(deadline: number): void {
    if (this.settled) return;
    this.timer = setTimeout(
      () => this.onWakeUp(deadline),
      deadline - this.now(),
    );
  }

  private onWakeUp(deadline: number): void {
    // a throttled timer wakes when it can; the clock decides whether the module is late
    if (this.now() < deadline) {
      this.expireAt(deadline);
      return;
    }
    this.settle(TIMED_OUT);
  }

  private clearTimer(): void {
    if (this.timer !== null) clearTimeout(this.timer);
    this.timer = null;
  }
}

/** Sends on one channel and settles on the module's own answer. */
export class ConfirmedWrite {
  /** One write in flight: the module answers in order, and nothing else correlates an ack with its command. */
  private readonly queue = new SerialQueue();
  private readonly unlisten: Unsubscribe;
  private pending: PendingAck | null = null;

  constructor(
    private readonly channel: Channel,
    private readonly now: () => number,
    private readonly timeoutMs: number = DEFAULT_WRITE_TIMEOUT_MS,
  ) {
    this.unlisten = channel.listen(this.onFrame);
  }

  /** Sends, then settles on the next ack the channel emits — or times out. */
  send(command: string): Promise<WriteOutcome> {
    return this.queue.run(() => this.sendNow(command));
  }

  dispose(): void {
    this.unlisten();
    this.pending?.settle(TIMED_OUT);
  }

  private async sendNow(command: string): Promise<WriteOutcome> {
    // the ack can land inside send(), so the write is pending before it leaves
    const pending = new PendingAck(this.now, () => {
      this.pending = null;
    });
    this.pending = pending;

    try {
      await this.channel.send(command);
    } catch {
      // a write the radio refused gets no answer either
      pending.settle(TIMED_OUT);
      return pending.outcome;
    }

    pending.expireAt(this.now() + this.timeoutMs);
    return pending.outcome;
  }

  private onFrame = (frame: string) => {
    const ack = parseAckMessage(frame);
    if (!ack) return;
    this.pending?.settle(ack.type === "ok" ? APPLIED : rejectedWrite(ack.code));
  };
}
