import {
  createObservable,
  Listener,
  Observable,
  Unsubscribe,
} from "@/core/observable";
import { parseAckMessage } from "@/domain/AckMessage";
import { Channel } from "@/domain/ports/Channel";

export type AdminSnapshot = {
  success: boolean;
  error: string | null;
};

export class AdminModule implements Observable<AdminSnapshot> {
  private readonly state: ReturnType<typeof createObservable<AdminSnapshot>>;
  private channelUnsub: Unsubscribe | null = null;

  constructor(private readonly channel: Channel) {
    this.state = createObservable<AdminSnapshot>({
      success: false,
      error: null,
    });

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

  setName(name: string): Promise<void> {
    return this.channel.send(`NAME:${name}`);
  }

  setPin(pin: string): Promise<void> {
    return this.channel.send(`PIN:${pin}`);
  }

  dispose = () => {
    this.channelUnsub?.();
    this.channelUnsub = null;
    this.state.destroy();
  };
}
