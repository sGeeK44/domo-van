import { createDetachedFanout } from "@/core/fanout";
import type { Listener, Unsubscribe } from "@/core/observable";
import type { Channel } from "@/domain/ports/Channel";
import type { ChannelScenario } from "@/infrastructure/fake/scenarios/Scenario";

const SILENT: ChannelScenario = () => [];

/** A channel whose peer is a scenario instead of a radio. */
export class FakeChannel implements Channel {
  readonly commands: string[] = [];
  private readonly frames = createDetachedFanout<string>();

  constructor(private readonly scenario: ChannelScenario = SILENT) {}

  listen(listener: Listener<string>): Unsubscribe {
    return this.frames.add(listener);
  }

  send(command: string): Promise<void> {
    this.commands.push(command);
    for (const frame of this.scenario(command)) {
      this.emit(frame);
    }
    return Promise.resolve();
  }

  emit(frame: string): void {
    this.frames.emit(frame);
  }

  get listenerCount(): number {
    return this.frames.size;
  }
}
