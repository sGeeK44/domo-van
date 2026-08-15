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
import {
  type ModuleIdentity,
  unsendableIdentity,
} from "@/domain/identityFrame";
import { Channel } from "@/domain/ports/Channel";
import {
  type IdentityOwner,
  type RejectedWrite,
  type SaveOutcome,
  saveFields,
  type WriteOutcome,
} from "@/domain/SaveOutcome";

export type { ModuleIdentity };

export type AdminSnapshot = {
  success: boolean;
  error: string | null;
  lastFeedback: Feedback | null;
};

export class AdminModule implements Observable<AdminSnapshot> {
  private readonly state: ReturnType<typeof createObservable<AdminSnapshot>>;
  private readonly writes: ConfirmedWrite;
  private channelUnsub: Unsubscribe | null = null;

  constructor(
    private readonly channel: Channel,
    private readonly owner: IdentityOwner,
    now: () => number = sinceBoot,
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

  resync = (): void => this.writes.forgetOwedAcks();

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
    return this.reported(this.writes.send(`NAME:${name}`));
  }

  setPin(pin: string): Promise<WriteOutcome> {
    return this.reported(this.writes.send(`PIN:${pin}`));
  }

  /** Name and pin travel as one command: the module reboots on the ack, so a second write would be lost. */
  saveIdentity(identity: ModuleIdentity): Promise<SaveOutcome> {
    return saveFields([
      {
        field: `${this.owner}.identity`,
        write: () => this.writeIdentity(identity),
      },
    ]);
  }

  private writeIdentity(identity: ModuleIdentity): Promise<WriteOutcome> {
    const unsendable = unsendableIdentity(identity);
    if (unsendable) return Promise.resolve(this.refuse(unsendable));

    return this.reported(
      this.writes.send(`ID:NAME=${identity.name};PIN=${identity.pin}`),
    );
  }

  /** A frame we refuse to send answers itself, in the vocabulary the module would have used. */
  private refuse(outcome: RejectedWrite): WriteOutcome {
    this.state.update((prev) => ({
      ...prev,
      success: false,
      error: outcome.code,
      lastFeedback: ackFailure(outcome.code),
    }));
    return outcome;
  }

  private async reported(
    sending: Promise<WriteOutcome>,
  ): Promise<WriteOutcome> {
    return this.report(await sending);
  }

  /** A refusal already reported itself as a frame; silence has to, and it clears the code of the write before it. */
  private report(outcome: WriteOutcome): WriteOutcome {
    const failure = unansweredWrite(outcome);
    if (!failure) return outcome;

    this.state.update((prev) => ({
      ...prev,
      success: false,
      error: null,
      lastFeedback: failure,
    }));
    return outcome;
  }

  dispose = () => {
    this.writes.dispose();
    this.channelUnsub?.();
    this.channelUnsub = null;
    this.state.destroy();
  };
}
