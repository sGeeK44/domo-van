import type { Listener, Unsubscribe } from "@/core/observable";
import type { Channel } from "@/domain/ports/Channel";
import type { ChannelScenario } from "@/infrastructure/fake/scenarios/Scenario";

const SILENT: ChannelScenario = () => [];

/** A channel whose peer is a scenario instead of a radio. */
export class FakeChannel implements Channel {
  readonly commands: string[] = [];
  private readonly listeners = new Set<Listener<string>>();

  constructor(private readonly scenario: ChannelScenario = SILENT) {}

  listen(listener: Listener<string>): Unsubscribe {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  send(command: string): Promise<void> {
    this.commands.push(command);
    for (const frame of this.scenario(command)) {
      this.emit(frame);
    }
    return Promise.resolve();
  }

  emit(frame: string): void {
    for (const listener of [...this.listeners]) {
      listener(frame);
    }
  }

  get listenerCount(): number {
    return this.listeners.size;
  }
}
