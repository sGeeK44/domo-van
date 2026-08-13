import {
  createObservable,
  type MutableObservable,
  type Observable,
} from "@/core/observable";
import { BatterySystem } from "@/domain/battery/BatterySystem";
import { HeaterSystem } from "@/domain/heater/HeaterSystem";
import type {
  ModuleDescriptor,
  ModuleKey,
} from "@/domain/modules/ModuleDescriptor";
import type { DeviceHandle } from "@/domain/ports/DeviceHandle";
import type { ModuleSessions } from "@/domain/ports/ModuleSessions";
import type { TransportFactory } from "@/domain/ports/TransportFactory";
import { WaterSystem } from "@/domain/water/WaterSystem";
import { PersistentBinaryTransport } from "@/infrastructure/session/PersistentBinaryTransport";
import { PersistentModuleTransport } from "@/infrastructure/session/PersistentModuleTransport";

export type LiveModuleSystems = {
  water: WaterSystem | null;
  heater: HeaterSystem | null;
  battery: BatterySystem | null;
};

export const NO_MODULE_SYSTEMS: LiveModuleSystems = {
  water: null,
  heater: null,
  battery: null,
};

type ModuleSystem = WaterSystem | HeaterSystem | BatterySystem;

type PersistentTransport = {
  bind(device: DeviceHandle): void;
  unbind(): void;
  dispose(): void;
};

type Session = { transport: PersistentTransport; system: ModuleSystem };

export class MissingServiceIdError extends Error {
  constructor(key: ModuleKey) {
    super(`Module "${key}" has no service id to open a module transport on.`);
    this.name = "MissingServiceIdError";
  }
}

/** The only place naming the typed systems: it maps a pairing to one instance that outlives every link drop. */
export class ModuleSystemSessions implements ModuleSessions {
  private readonly sessions = new Map<ModuleKey, Session>();
  private readonly live: MutableObservable<LiveModuleSystems> =
    createObservable<LiveModuleSystems>(NO_MODULE_SYSTEMS);
  readonly systems: Observable<LiveModuleSystems> = this.live;

  constructor(private readonly transports: TransportFactory) {}

  open(module: ModuleDescriptor): void {
    if (this.sessions.has(module.key)) return;
    this.sessions.set(module.key, this.createSession(module));
    this.publish();
  }

  bind(module: ModuleDescriptor, device: DeviceHandle): void {
    const session = this.sessions.get(module.key);
    if (!session) return;
    session.transport.bind(device);
    session.system.resync();
  }

  unbind(module: ModuleDescriptor): void {
    this.sessions.get(module.key)?.transport.unbind();
  }

  close(module: ModuleDescriptor): void {
    const session = this.sessions.get(module.key);
    if (!session) return;
    this.sessions.delete(module.key);
    session.transport.dispose();
    session.system.dispose();
    this.publish();
  }

  private createSession(module: ModuleDescriptor): Session {
    if (module.key === "battery") {
      const transport = new PersistentBinaryTransport((device) =>
        this.transports.binaryTransport(device),
      );
      return { transport, system: new BatterySystem(transport) };
    }

    const transport = this.moduleTransportFor(module);
    return module.key === "water"
      ? { transport, system: new WaterSystem(transport) }
      : { transport, system: new HeaterSystem(transport) };
  }

  private moduleTransportFor(
    module: ModuleDescriptor,
  ): PersistentModuleTransport {
    const { serviceId } = module;
    if (!serviceId) throw new MissingServiceIdError(module.key);
    return new PersistentModuleTransport((device) =>
      this.transports.moduleTransport(device, serviceId),
    );
  }

  private publish(): void {
    this.live.setValue({
      water: systemOf(this.sessions.get("water"), WaterSystem),
      heater: systemOf(this.sessions.get("heater"), HeaterSystem),
      battery: systemOf(this.sessions.get("battery"), BatterySystem),
    });
  }
}

function systemOf<T extends ModuleSystem>(
  session: Session | undefined,
  type: abstract new (...args: never[]) => T,
): T | null {
  const system = session?.system;
  return system instanceof type ? system : null;
}
