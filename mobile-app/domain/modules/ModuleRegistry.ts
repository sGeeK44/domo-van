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

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("Connection timeout")), ms);

    promise
      .then((result) => {
        clearTimeout(timer);
        resolve(result);
      })
      .catch((error) => {
        clearTimeout(timer);
        reject(error);
      });
  });
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
    await this.repository.setLastDevice(pairing, key);
    this.patch(key, { pairing });
    this.sessions.open(slot.module, pairing);

    await this.connect(key);
  }

  async unpair(key: ModuleKey): Promise<void> {
    const slot = this.slotOf(key);
    if (!slot.pairing) return;

    const handle = this.handles.get(key);
    this.stopWatching(key);
    this.handles.delete(key);
    this.sessions.unbind(slot.module);
    this.sessions.close(slot.module);

    if (handle) {
      try {
        await this.connector.disconnect(handle);
      } catch {
        // the radio link may already be down
      }
    }

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
    this.patch(key, { link: { status: "connecting" } });

    try {
      const device = await withTimeout(
        this.connector.connect(slot.pairing.id),
        this.connectTimeoutMs,
      );
      if (this.disposed) return;

      this.handles.set(key, device);
      this.linkWatchers.set(
        key,
        this.connector.onDisconnected(device, () => this.dropLink(key)),
      );
      this.sessions.bind(slot.module, device);
      this.patch(key, { link: { status: "online", since: this.now() } });
    } catch {
      this.patch(key, { link: offline(lastContactAt) });
    }
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
