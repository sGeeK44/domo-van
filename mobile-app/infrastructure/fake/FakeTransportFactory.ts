import { ALL_MODULES, type ModuleKey } from "@/domain/modules/ModuleDescriptor";
import type { BinaryTransport } from "@/domain/ports/BinaryTransport";
import type { DeviceHandle } from "@/domain/ports/DeviceHandle";
import type { ModuleTransport } from "@/domain/ports/ModuleTransport";
import type { TransportFactory } from "@/domain/ports/TransportFactory";
import { FakeBinaryTransport } from "@/infrastructure/fake/FakeBinaryTransport";
import { FakeModuleTransport } from "@/infrastructure/fake/FakeModuleTransport";
import { heaterScenario } from "@/infrastructure/fake/scenarios/heaterScenario";
import type { ModuleScenario } from "@/infrastructure/fake/scenarios/Scenario";
import { waterScenario } from "@/infrastructure/fake/scenarios/waterScenario";

export class UnscriptedServiceError extends Error {
  constructor(serviceId: string) {
    super(`No scenario is scripted for service "${serviceId}".`);
    this.name = "UnscriptedServiceError";
  }
}

const SCENARIOS: Partial<Record<ModuleKey, () => ModuleScenario>> = {
  water: waterScenario,
  heater: heaterScenario,
};

function scenarioFor(serviceId: string): ModuleScenario {
  const module = ALL_MODULES.find((it) => it.serviceId === serviceId);
  const scenario = module && SCENARIOS[module.key];
  if (!scenario) throw new UnscriptedServiceError(serviceId);
  return scenario();
}

export type FakeTransportFactoryOptions = {
  /** Cadence of the unsolicited BMS telemetry; 0 leaves the transport silent. */
  telemetryIntervalMs?: number;
};

/** Serves one transport per device: a second one would be a second firmware. */
export class FakeTransportFactory implements TransportFactory {
  private readonly modules = new Map<string, FakeModuleTransport>();
  private readonly binaries = new Map<string, BinaryTransport>();
  private readonly telemetryIntervalMs: number;

  constructor(options: FakeTransportFactoryOptions = {}) {
    this.telemetryIntervalMs = options.telemetryIntervalMs ?? 0;
  }

  moduleTransport(device: DeviceHandle, serviceId: string): ModuleTransport {
    return reuse(
      this.modules,
      `${device.id}/${serviceId}`,
      () => new FakeModuleTransport(scenarioFor(serviceId)),
    );
  }

  /** The firmware already served for a device, so a caller can make it speak unprompted. */
  servedModule(
    deviceId: string,
    serviceId: string,
  ): FakeModuleTransport | null {
    return this.modules.get(`${deviceId}/${serviceId}`) ?? null;
  }

  /** Forgets every transport served, so the next pairing meets a firmware in its initial state. */
  forgetAll(): void {
    this.modules.clear();
    this.binaries.clear();
  }

  binaryTransport(device: DeviceHandle): BinaryTransport {
    return reuse(
      this.binaries,
      device.id,
      () => new FakeBinaryTransport({ intervalMs: this.telemetryIntervalMs }),
    );
  }
}

function reuse<T>(cache: Map<string, T>, key: string, build: () => T): T {
  const known = cache.get(key);
  if (known) return known;

  const built = build();
  cache.set(key, built);
  return built;
}
