import { HEATER_MODULE, WATER_MODULE } from "@/domain/modules/ModuleDescriptor";
import type { Channel } from "@/domain/ports/Channel";
import type { DeviceHandle } from "@/domain/ports/DeviceHandle";
import type { ModuleTransport } from "@/domain/ports/ModuleTransport";
import { FakeChannel } from "@/infrastructure/fake/FakeChannel";
import { heaterScenario } from "@/infrastructure/fake/scenarios/heaterScenario";
import type { ModuleScenario } from "@/infrastructure/fake/scenarios/Scenario";
import { waterScenario } from "@/infrastructure/fake/scenarios/waterScenario";

export class UnscriptedServiceError extends Error {
  constructor(serviceId: string) {
    super(`No fake scenario for service ${serviceId}`);
    this.name = "UnscriptedServiceError";
  }
}

/** A module transport backed by a scenario, so a screen runs off-vehicle. */
export class FakeModuleTransport implements ModuleTransport {
  /** Mirrors `TransportFactory.moduleTransport`; no radio stands behind the handle. */
  static forDevice(
    _device: DeviceHandle,
    serviceId: string,
  ): FakeModuleTransport {
    return new FakeModuleTransport(scenarioForService(serviceId));
  }

  private readonly channels = new Map<string, FakeChannel>();

  constructor(private readonly scenario: ModuleScenario) {}

  openChannel(channelId: string): Channel {
    return this.channel(channelId);
  }

  channel(channelId: string): FakeChannel {
    const open = this.channels.get(channelId);
    if (open) return open;

    const channel = new FakeChannel(this.scenario[channelId]);
    this.channels.set(channelId, channel);
    return channel;
  }
}

function scenarioForService(serviceId: string): ModuleScenario {
  if (serviceId === WATER_MODULE.serviceId) return waterScenario();
  if (serviceId === HEATER_MODULE.serviceId) return heaterScenario();
  throw new UnscriptedServiceError(serviceId);
}
