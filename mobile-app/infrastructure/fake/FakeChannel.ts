import { createDetachedFanout } from "@/core/fanout";
import type { Listener, Unsubscribe } from "@/core/observable";
import type { Channel } from "@/domain/ports/Channel";
import type { ChannelScenario } from "@/infrastructure/fake/scenarios/Scenario";

const SILENT: ChannelScenario = () => [];

/** A channel whose peer is a scenario instead of a radio. */
export class FakeChannel implements Channel {
  readonly commands: string[] = [];
  private readonly frames = createDetachedFanout<string>();
  private linkDown = false;

  constructor(private readonly scenario: ChannelScenario = SILENT) {}

  listen(listener: Listener<string>): Unsubscribe {
    return this.frames.add(listener);
  }

  /** The radio link dropped: no write lands, and no frame answers one. */
  dropLink(): void {
    this.linkDown = true;
  }

  send(command: string): Promise<void> {
    if (this.linkDown) {
      return Promise.reject(new Error(`link is down, dropped: ${command}`));
    }
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
