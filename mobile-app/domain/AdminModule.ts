import {
  createObservable,
  Listener,
  Observable,
  Unsubscribe,
} from "@/core/observable";
import { parseAckMessage } from "@/domain/AckMessage";
import { ConfirmedWrite } from "@/domain/ConfirmedWrite";
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
    this.state.update((prev) => {
      return {
        ...prev,
        success: ack?.type === "ok",
        error: ack?.type === "error" ? ack.code : null,
      };
    });
  };

  setName(name: string): Promise<WriteOutcome> {
    return this.writes.send(`NAME:${name}`);
  }

  setPin(pin: string): Promise<WriteOutcome> {
    return this.writes.send(`PIN:${pin}`);
  }

  saveIdentity(identity: ModuleIdentity): Promise<SaveOutcome> {
    return saveFields([
      { field: this.field("name"), write: () => this.setName(identity.name) },
      { field: this.field("pin"), write: () => this.setPin(identity.pin) },
    ]);
  }

  private field(part: "name" | "pin"): SaveFieldKey {
    return `${this.owner}.identity.${part}`;
  }

  dispose = () => {
    this.writes.dispose();
    this.channelUnsub?.();
    this.channelUnsub = null;
    this.state.destroy();
  };
}
