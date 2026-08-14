import type { Channel } from "@/domain/ports/Channel";
import type { ModuleTransport } from "@/domain/ports/ModuleTransport";
import { FakeChannel } from "@/infrastructure/fake/FakeChannel";
import {
  asScript,
  type ModuleScenario,
} from "@/infrastructure/fake/scenarios/Scenario";

/** A module transport backed by a scenario, so a screen runs off-vehicle. */
export class FakeModuleTransport implements ModuleTransport {
  private readonly channels = new Map<string, FakeChannel>();

  constructor(private readonly scenario: ModuleScenario) {}

  openChannel(channelId: string): Channel {
    return this.channel(channelId);
  }

  channel(channelId: string): FakeChannel {
    const open = this.channels.get(channelId);
    if (open) return open;

    const script = asScript(this.scenario[channelId]);
    const channel = new FakeChannel(script.respond, script.cadence);
    this.channels.set(channelId, channel);
    return channel;
  }
}
