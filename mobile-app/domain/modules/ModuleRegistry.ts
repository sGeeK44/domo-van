import {
  createObservable,
  type Listener,
  type MutableObservable,
  type Observable,
  type Unsubscribe,
} from "@/core/observable";
import {
  ALL_MODULES,
  type ModuleDescriptor,
  type ModuleKey,
} from "@/domain/modules/ModuleDescriptor";
import type { LinkState, ModuleSlot } from "@/domain/modules/ModuleSlot";
import type { DiscoveredBluetoothDevice } from "@/domain/ports/BluetoothScanner";
import type { DeviceConnector } from "@/domain/ports/DeviceConnector";
import type { DeviceHandle } from "@/domain/ports/DeviceHandle";
import type {
  DeviceInfo,
  DeviceRepository,
} from "@/domain/ports/DeviceRepository";
import type { ModuleSessions } from "@/domain/ports/ModuleSessions";

const DEFAULT_CONNECT_TIMEOUT_MS = 15_000;

export class SlotOccupiedError extends Error {
  constructor(readonly key: ModuleKey) {
    super(`Module slot "${key}" already holds a pairing`);
    this.name = "SlotOccupiedError";
  }
}

function offline(lastContactAt: number | null = null): LinkState {
  return { status: "offline", lastContactAt };
}

function lastContactOf(link: LinkState): number | null {
  if (link.status === "online") return link.since;
  if (link.status === "offline") return link.lastContactAt;
  return null;
}

type PairedEntry = { module: ModuleDescriptor; pairing: DeviceInfo };

type AbortConnect = (reason: string) => void;

export type ModuleRegistryDeps = {
  repository: DeviceRepository;
  connector: DeviceConnector;
  sessions: ModuleSessions;
  now?: () => number;
  connectTimeoutMs?: number;
};

export class ModuleRegistry implements Observable<readonly ModuleSlot[]> {
  private readonly repository: DeviceRepository;
  private readonly connector: DeviceConnector;
  private readonly sessions: ModuleSessions;
  private readonly now: () => number;
  private readonly connectTimeoutMs: number;
  private readonly slots: MutableObservable<readonly ModuleSlot[]>;
  private readonly handles = new Map<ModuleKey, DeviceHandle>();
  private readonly linkWatchers = new Map<ModuleKey, Unsubscribe>();
  private readonly epochs = new Map<ModuleKey, number>();
  private readonly pendingConnects = new Set<AbortConnect>();
  private disposed = false;

  constructor(deps: ModuleRegistryDeps) {
    this.repository = deps.repository;
    this.connector = deps.connector;
    this.sessions = deps.sessions;
    this.now = deps.now ?? Date.now;
    this.connectTimeoutMs = deps.connectTimeoutMs ?? DEFAULT_CONNECT_TIMEOUT_MS;
    this.slots = createObservable<readonly ModuleSlot[]>(
      ALL_MODULES.map((module) => ({ module, pairing: null, link: offline() })),
    );
  }

  getValue(): readonly ModuleSlot[] {
    return this.slots.getValue();
  }

  subscribe(listener: Listener<readonly ModuleSlot[]>): Unsubscribe {
    return this.slots.subscribe(listener);
  }

  slotOf(key: ModuleKey): ModuleSlot {
    const slot = this.slots
      .getValue()
      .find((candidate) => candidate.module.key === key);
    if (!slot) throw new Error(`Unknown module "${key}"`);
    return slot;
  }

  async start(): Promise<void> {
    const restored = await Promise.all(
      ALL_MODULES.map(async (module) => ({
        module,
        pairing: await this.repository.getLastDevice(module.key),
      })),
    );
    const paired = restored.filter(
      (entry): entry is PairedEntry => entry.pairing !== null,
    );

    for (const entry of paired) {
      this.patch(entry.module.key, { pairing: entry.pairing });
      this.sessions.open(entry.module, entry.pairing);
    }

    await Promise.allSettled(
      paired.map((entry) => this.connect(entry.module.key)),
    );
  }

  async pair(key: ModuleKey, device: DiscoveredBluetoothDevice): Promise<void> {
    const slot = this.slotOf(key);
    if (slot.pairing) throw new SlotOccupiedError(key);

    const pairing: DeviceInfo = {
      id: device.id,
      name: device.name || slot.module.displayName,
    };
    this.claimSlot(key, pairing);

    try {
      await this.repository.setLastDevice(pairing, key);
    } catch (error) {
      this.restoreSlot(key, slot);
      throw error;
    }

    this.sessions.open(slot.module, pairing);

    await this.connect(key);
  }

  async unpair(key: ModuleKey): Promise<void> {
    const slot = this.slotOf(key);
    if (!slot.pairing) return;

    this.bumpEpoch(key);
    const handle = this.handles.get(key);
    this.stopWatching(key);
    this.handles.delete(key);
    this.sessions.unbind(slot.module);
    this.sessions.close(slot.module);

    if (handle) await this.releaseHandle(handle);

    await this.repository.clearLastDevice(key);
    this.patch(key, { pairing: null, link: offline() });
  }

  async reconnect(key: ModuleKey): Promise<void> {
    const slot = this.slotOf(key);
    if (!slot.pairing || slot.link.status !== "offline") return;

    await this.connect(key);
  }

  dispose(): void {
    this.disposed = true;
    for (const abort of [...this.pendingConnects]) abort("Registry disposed");
    this.pendingConnects.clear();
    for (const slot of this.slots.getValue()) {
      this.stopWatching(slot.module.key);
      if (slot.pairing) this.sessions.close(slot.module);
    }
    this.handles.clear();
    this.slots.destroy();
  }

  private async connect(key: ModuleKey): Promise<void> {
    const slot = this.slotOf(key);
    if (!slot.pairing) return;

    const lastContactAt = lastContactOf(slot.link);
    const epoch = this.epochOf(key);
    this.patch(key, { link: { status: "connecting" } });

    let device: DeviceHandle;
    try {
      device = await this.connectWithTimeout(slot.pairing.id);
    } catch {
      if (this.isStale(key, epoch)) return;
      this.patch(key, { link: offline(lastContactAt) });
      return;
    }

    if (this.isStale(key, epoch)) {
      await this.releaseHandle(device);
      return;
    }

    this.attachLink(key, slot.module, device);
    this.patch(key, { link: { status: "online", since: this.now() } });
  }

  private connectWithTimeout(deviceId: string): Promise<DeviceHandle> {
    return new Promise<DeviceHandle>((resolve, reject) => {
      let pending = true;
      const settle = () => {
        pending = false;
        clearTimeout(timer);
        this.pendingConnects.delete(abort);
      };
      const abort: AbortConnect = (reason) => {
        if (!pending) return;
        settle();
        reject(new Error(reason));
      };
      const timer = setTimeout(
        () => abort("Connection timeout"),
        this.connectTimeoutMs,
      );
      this.pendingConnects.add(abort);

      this.connector.connect(deviceId).then(
        (device) => {
          if (!pending) {
            void this.releaseHandle(device);
            return;
          }
          settle();
          resolve(device);
        },
        (error: unknown) => {
          if (!pending) return;
          settle();
          reject(error);
        },
      );
    });
  }

  private attachLink(
    key: ModuleKey,
    module: ModuleDescriptor,
    device: DeviceHandle,
  ): void {
    this.stopWatching(key);
    this.handles.set(key, device);
    this.linkWatchers.set(
      key,
      this.connector.onDisconnected(device, () => this.dropLink(key)),
    );
    this.sessions.bind(module, device);
  }

  private async releaseHandle(device: DeviceHandle): Promise<void> {
    try {
      await this.connector.disconnect(device);
    } catch {
      // the radio link may already be down
    }
  }

  private claimSlot(key: ModuleKey, pairing: DeviceInfo): void {
    this.bumpEpoch(key);
    this.patch(key, { pairing });
  }

  private restoreSlot(key: ModuleKey, previous: ModuleSlot): void {
    this.bumpEpoch(key);
    this.patch(key, { pairing: previous.pairing, link: previous.link });
  }

  private isStale(key: ModuleKey, epoch: number): boolean {
    return this.disposed || this.epochOf(key) !== epoch;
  }

  private epochOf(key: ModuleKey): number {
    return this.epochs.get(key) ?? 0;
  }

  private bumpEpoch(key: ModuleKey): void {
    this.epochs.set(key, this.epochOf(key) + 1);
  }

  private dropLink(key: ModuleKey): void {
    const slot = this.slotOf(key);
    this.stopWatching(key);
    this.handles.delete(key);
    this.sessions.unbind(slot.module);
    this.patch(key, { link: offline(this.now()) });
  }

  private stopWatching(key: ModuleKey): void {
    this.linkWatchers.get(key)?.();
    this.linkWatchers.delete(key);
  }

  private patch(key: ModuleKey, change: Partial<ModuleSlot>): void {
    this.slots.update((slots) =>
      slots.map((slot) =>
        slot.module.key === key ? { ...slot, ...change } : slot,
      ),
    );
  }
}
