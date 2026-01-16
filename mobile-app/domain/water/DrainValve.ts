import { Channel } from "@/core/bluetooth/Channel";
import { createObservable, Listener, Unsubscribe } from "@/core/observable";


export type ValvePosition = "open" | "closed" | "unknown";

type ValveState = { position: ValvePosition };

export class DrainValve {
  private readonly state = createObservable<ValveState>({ position: "unknown" });

  constructor(private readonly channel: Channel) {
  }

  getValue = () => this.state.getValue();

  subscribe = (listener: Listener<ValvePosition>): Unsubscribe =>
    this.state.subscribe((state) => listener(state.position));

  open = async () => {
    this.state.setValue({ position: "open" });
    try {
      await this.channel.send("OPEN");
    } catch {
      this.state.setValue({ position: "unknown" });
    }
  };

  close = async () => {
    this.state.setValue({ position: "closed" });
    try {
      await this.channel.send("CLOSE");
    } catch {
      this.state.setValue({ position: "unknown" });
    }
  };

  dispose = () => {
    this.state.destroy();
  };
}
