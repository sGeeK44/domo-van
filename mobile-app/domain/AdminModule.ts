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
import {
  type IdentityOwner,
  type SaveFieldKey,
  type SaveOutcome,
  saveFields,
  type WriteOutcome,
} from "@/domain/SaveOutcome";

export type AdminSnapshot = {
  success: boolean;
  error: string | null;
  lastFeedback: Feedback | null;
};

export type ModuleIdentity = {
  name: string;
  pin: string;
};

export class AdminModule implements Observable<AdminSnapshot> {
  private readonly state: ReturnType<typeof createObservable<AdminSnapshot>>;
  private readonly writes: ConfirmedWrite;
  private channelUnsub: Unsubscribe | null = null;

  constructor(
    private readonly channel: Channel,
    private readonly owner: IdentityOwner,
    now: () => number = Date.now,
  ) {
    this.state = createObservable<AdminSnapshot>({
      success: false,
      error: null,
      lastFeedback: null,
    });
    this.writes = new ConfirmedWrite(this.channel, now);

    // Subscribe first, then request config (so the response is not missed).
    this.channelUnsub = this.channel.listen(this.onMessageReceived);
  }

  getValue = () => this.state.getValue();

  subscribe = (listener: Listener<AdminSnapshot>): Unsubscribe => {
    return this.state.subscribe(listener);
  };

  private onMessageReceived = (msg: string) => {
    const ack = parseAckMessage(msg);
    if (!ack) return;
    this.state.update((prev) => {
      return {
        ...prev,
        success: ack.type === "ok",
        error: ack.type === "error" ? ack.code : null,
        lastFeedback: ack.type === "ok" ? SAVED : ackFailure(ack.code),
      };
    });
  };

  setName(name: string): Promise<WriteOutcome> {
    return this.report(this.writes.send(`NAME:${name}`));
  }

  setPin(pin: string): Promise<WriteOutcome> {
    return this.report(this.writes.send(`PIN:${pin}`));
  }

  /** Name and pin travel as one command: the module reboots on the ack, so a second write would be lost. */
  saveIdentity(identity: ModuleIdentity): Promise<SaveOutcome> {
    return saveFields([
      {
        field: `${this.owner}.identity` satisfies SaveFieldKey,
        write: () =>
          this.report(
            this.writes.send(`ID:NAME=${identity.name};PIN=${identity.pin}`),
          ),
      },
    ]);
  }

  private async report(sending: Promise<WriteOutcome>): Promise<WriteOutcome> {
    const outcome = await sending;
    const failure = unansweredWrite(outcome);
    if (failure) {
      this.state.update((prev) => ({
        ...prev,
        success: false,
        lastFeedback: failure,
      }));
    }
    return outcome;
  }

  dispose = () => {
    this.writes.dispose();
    this.channelUnsub?.();
    this.channelUnsub = null;
    this.state.destroy();
  };
}
