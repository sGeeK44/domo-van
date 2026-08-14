import { createFanout, type Fanout, type Source } from "@/core/fanout";
import type { Listener, Unsubscribe } from "@/core/observable";
import type { Channel } from "@/domain/ports/Channel";
import type {
  ChannelCadence,
  ChannelScenario,
} from "@/infrastructure/fake/scenarios/Scenario";

const SILENT: ChannelScenario = () => [];

/** A channel whose peer is a scenario instead of a radio. */
export class FakeChannel implements Channel {
  readonly commands: string[] = [];
  private readonly frames: Fanout<string>;
  private linkDown = false;

  constructor(
    private readonly scenario: ChannelScenario = SILENT,
    private readonly cadence?: ChannelCadence,
  ) {
    this.frames = createFanout<string>(() => this.startTicking());
  }

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

  /** A module only pushes to someone: the cadence runs while the channel is listened to. */
  private startTicking(): Source {
    const cadence = this.cadence;
    if (!cadence || cadence.intervalMs <= 0) return { remove: () => {} };

    const ticker = setInterval(() => {
      for (const frame of cadence.next()) this.emit(frame);
    }, cadence.intervalMs);
    return { remove: () => clearInterval(ticker) };
  }
}
