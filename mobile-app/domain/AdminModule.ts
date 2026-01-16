import { Channel } from "@/core/bluetooth/Channel";
import { createObservable, Listener, Observable, Unsubscribe } from "@/core/observable";

export type AdminSnapshot = {
  success: boolean;
  error: string | null;
};

export class AdminModule implements Observable<AdminSnapshot> {
    private readonly state: ReturnType<typeof createObservable<AdminSnapshot>>;
    private channelUnsub: Unsubscribe | null = null;

    constructor(
      private readonly channel: Channel,
    ) {
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
      const trimmed = msg.trim();
      this.state.update((prev) => {
        return {
          ...prev,
          success: trimmed === "OK",
          error: trimmed.startsWith("ERR_") ? trimmed : null,
        };
      });
    }

    setName(name: string) {
      this.channel.send(`NAME:${name}`);
    }

    setPin(pin: string) {
      this.channel.send(`PIN:${pin}`);
    }

    dispose = () => {
      this.channelUnsub?.();
      this.channelUnsub = null;
      this.state.destroy();
    };
  }
