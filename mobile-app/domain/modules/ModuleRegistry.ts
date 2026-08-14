import {
  createObservable,
  type Listener,
  type MutableObservable,
  type Observable,
  type Unsubscribe,
} from "@/core/observable";
import { ALL_MODULES, type ModuleKey } from "@/domain/modules/ModuleDescriptor";
import type { ModuleSlot } from "@/domain/modules/ModuleSlot";
import { ModuleSlotController } from "@/domain/modules/ModuleSlotController";
import type { DiscoveredBluetoothDevice } from "@/domain/ports/BluetoothScanner";
import type { DeviceConnector } from "@/domain/ports/DeviceConnector";
import type {
  DeviceInfo,
  DeviceRepository,
} from "@/domain/ports/DeviceRepository";
import type { ModuleSessions } from "@/domain/ports/ModuleSessions";

export { SlotOccupiedError } from "@/domain/modules/SlotOccupiedError";

const DEFAULT_CONNECT_TIMEOUT_MS = 15_000;

type StoredPairing = { controller: ModuleSlotController; pairing: DeviceInfo };

export type ModuleRegistryDeps = {
  repository: DeviceRepository;
  connector: DeviceConnector;
  sessions: ModuleSessions;
  now?: () => number;
  connectTimeoutMs?: number;
};

export class ModuleRegistry implements Observable<readonly ModuleSlot[]> {
  private readonly repository: DeviceRepository;
  private readonly controllers: readonly ModuleSlotController[];
  private readonly slots: MutableObservable<readonly ModuleSlot[]>;

  constructor(deps: ModuleRegistryDeps) {
    this.repository = deps.repository;
    this.slots = createObservable<readonly ModuleSlot[]>([]);
    this.controllers = ALL_MODULES.map(
      (module) =>
        new ModuleSlotController({
          module,
          repository: deps.repository,
          connector: deps.connector,
          sessions: deps.sessions,
          now: deps.now ?? Date.now,
          connectTimeoutMs: deps.connectTimeoutMs ?? DEFAULT_CONNECT_TIMEOUT_MS,
          onChange: () => this.publish(),
        }),
    );
    this.publish();
  }

  getValue(): readonly ModuleSlot[] {
    return this.slots.getValue();
  }

  subscribe(listener: Listener<readonly ModuleSlot[]>): Unsubscribe {
    return this.slots.subscribe(listener);
  }

  slotOf(key: ModuleKey): ModuleSlot {
    return this.controllerOf(key).snapshot();
  }

  async start(): Promise<void> {
    const stored = await this.storedPairings();

    await Promise.allSettled(
      stored.map((entry) => entry.controller.restore(entry.pairing)),
    );
  }

  async pair(key: ModuleKey, device: DiscoveredBluetoothDevice): Promise<void> {
    const controller = this.controllerOf(key);
    await controller.claim({ id: device.id, name: device.name });
  }

  async unpair(key: ModuleKey): Promise<void> {
    await this.controllerOf(key).release();
  }

  async reconnect(key: ModuleKey): Promise<void> {
    await this.controllerOf(key).reconnect();
  }

  dispose(): void {
    for (const controller of this.controllers) controller.dispose();
    this.slots.destroy();
  }

  private async storedPairings(): Promise<StoredPairing[]> {
    const reads = await Promise.allSettled(
      this.controllers.map((controller) => this.storedPairing(controller)),
    );
    return reads.flatMap((read) =>
      read.status === "fulfilled" && read.value ? [read.value] : [],
    );
  }

  private async storedPairing(
    controller: ModuleSlotController,
  ): Promise<StoredPairing | null> {
    const pairing = await this.repository.getLastDevice(controller.module.key);
    return pairing ? { controller, pairing } : null;
  }

  private controllerOf(key: ModuleKey): ModuleSlotController {
    const controller = this.controllers.find(
      (candidate) => candidate.module.key === key,
    );
    if (!controller) throw new Error(`Unknown module "${key}"`);
    return controller;
  }

  private snapshot(): readonly ModuleSlot[] {
    return this.controllers.map((controller) => controller.snapshot());
  }

  private publish(): void {
    this.slots.setValue(this.snapshot());
  }
}
