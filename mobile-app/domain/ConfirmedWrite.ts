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

/** One command waiting for the answer the module owes it. */
class PendingAck {
  readonly outcome: Promise<WriteOutcome>;
  private readonly deadline: Deadline;
  private answer: (outcome: WriteOutcome) => void = () => {};
  private settled = false;

  constructor(
    now: () => number,
    private readonly onSettled: (outcome: WriteOutcome) => void,
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
    this.onSettled(outcome);
    this.answer(outcome);
  }
}

/** Sends on one channel and settles on the module's own answer. */
export class ConfirmedWrite {
  /** One write in flight: the module answers in order, and nothing else correlates an ack with its command. */
  private readonly queue = new SerialQueue();
  private readonly unlisten: Unsubscribe;
  private pending: PendingAck | null = null;
  /** Answers a timed-out write may still owe us; each is forgotten if it does not come. */
  private readonly owedAcks: Deadline[] = [];
  private disposed = false;

  constructor(
    private readonly channel: Channel,
    private readonly now: () => number = sinceBoot,
    private readonly timeoutMs: number = DEFAULT_WRITE_TIMEOUT_MS,
  ) {
    this.unlisten = channel.listen(this.onFrame);
  }

  /** Sends, then settles on the next ack the channel emits — or times out. */
  send(command: string): Promise<WriteOutcome> {
    return this.queue.run(() => this.sendNow(command));
  }

  /** A reconnected module owes nothing: whatever it was going to answer died with the link. */
  forgetOwedAcks(): void {
    for (const owed of this.owedAcks) owed.cancel();
    this.owedAcks.length = 0;
  }

  dispose(): void {
    this.disposed = true;
    this.unlisten();
    this.forgetOwedAcks();
    this.pending?.settle(UNREACHABLE);
  }

  private sendNow(command: string): Promise<WriteOutcome> {
    if (this.disposed) return Promise.resolve(UNREACHABLE);

    // the ack can land inside send(), so the write is pending before it leaves
    const pending = new PendingAck(this.now, (outcome) => {
      this.pending = null;
      if (outcome.status === "timedOut") this.oweAnAck();
    });
    this.pending = pending;
    // the deadline covers the write itself: a GATT call that hangs must not hold the queue
    pending.expireIn(this.timeoutMs);
    void this.channel.send(command).catch(() => pending.settle(UNREACHABLE));

    return pending.outcome;
  }

  /** An ack still missing one window later is lost, not late: keeping the debt would spend the next write's answer. */
  private oweAnAck(): void {
    const owed = new Deadline(this.now, () => this.spendOwedAck(owed));
    this.owedAcks.push(owed);
    owed.armFor(this.timeoutMs);
  }

  private spendOwedAck(owed: Deadline): void {
    const at = this.owedAcks.indexOf(owed);
    if (at === -1) return;
    this.owedAcks.splice(at, 1);
    owed.cancel();
  }

  private onFrame = (frame: string) => {
    const ack = parseAckMessage(frame);
    if (!ack) return;
    // a late ack answers the write that gave up on it, never the one in flight
    const owed = this.owedAcks[0];
    if (owed) {
      this.spendOwedAck(owed);
      return;
    }
    this.pending?.settle(ack.type === "ok" ? APPLIED : rejectedWrite(ack.code));
  };
}
