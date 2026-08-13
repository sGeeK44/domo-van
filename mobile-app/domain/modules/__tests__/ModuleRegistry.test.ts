import { afterEach, describe, expect, it, vi } from "vitest";
import {
  HEATER_MODULE,
  type ModuleDescriptor,
  type ModuleKey,
  WATER_MODULE,
} from "@/domain/modules/ModuleDescriptor";
import {
  ModuleRegistry,
  SlotOccupiedError,
} from "@/domain/modules/ModuleRegistry";
import type { DiscoveredBluetoothDevice } from "@/domain/ports/BluetoothScanner";
import type { DeviceConnector } from "@/domain/ports/DeviceConnector";
import type { DeviceHandle } from "@/domain/ports/DeviceHandle";
import type {
  DeviceInfo,
  DeviceRepository,
} from "@/domain/ports/DeviceRepository";
import type { ModuleSessions } from "@/domain/ports/ModuleSessions";

const WATER_DEVICE = { id: "water-1", name: "Water Module" };
const HEATER_DEVICE = { id: "heater-1", name: "Heater Module" };

function discovered(
  device: DeviceInfo,
  module: ModuleDescriptor,
): DiscoveredBluetoothDevice {
  return { ...device, serviceUuids: [module.scanServiceUuid] };
}

const WATER_SCAN = discovered(WATER_DEVICE, WATER_MODULE);
const HEATER_SCAN = discovered(HEATER_DEVICE, HEATER_MODULE);

type DeferredConnect = {
  resolve: (handle: DeviceHandle) => void;
  reject: (error: Error) => void;
};

function handleFor(deviceId: string): DeviceHandle {
  return { id: deviceId, name: `handle:${deviceId}` };
}

async function flushMicrotasks(): Promise<void> {
  for (let turn = 0; turn < 5; turn += 1) await Promise.resolve();
}

class StubRepository implements DeviceRepository {
  private readonly stored = new Map<ModuleKey, DeviceInfo>();
  readonly writes: { key: ModuleKey; device: DeviceInfo }[] = [];
  readonly clears: ModuleKey[] = [];
  private clearGate: Promise<void> | null = null;
  private openClearGate: (() => void) | null = null;

  store(key: ModuleKey, device: DeviceInfo): void {
    this.stored.set(key, device);
  }

  blockClears(): void {
    this.clearGate = new Promise<void>((resolve) => {
      this.openClearGate = resolve;
    });
  }

  releaseClears(): void {
    this.openClearGate?.();
    this.clearGate = null;
    this.openClearGate = null;
  }

  async getLastDevice(moduleKey: ModuleKey): Promise<DeviceInfo | null> {
    return this.stored.get(moduleKey) ?? null;
  }

  async setLastDevice(device: DeviceInfo, moduleKey: ModuleKey): Promise<void> {
    this.stored.set(moduleKey, device);
    this.writes.push({ key: moduleKey, device });
  }

  async clearLastDevice(moduleKey: ModuleKey): Promise<void> {
    await this.clearGate;
    this.stored.delete(moduleKey);
    this.clears.push(moduleKey);
  }
}

class StubConnector implements DeviceConnector {
  readonly connectCalls: string[] = [];
  readonly disconnectCalls: string[] = [];
  private readonly listeners = new Map<string, Set<() => void>>();
  private readonly deferred = new Map<string, DeferredConnect[]>();
  private readonly requestSignals = new Map<string, () => void>();
  private hangs = false;
  private defers = false;
  private rejection: Error | null = null;

  hangForever(): void {
    this.hangs = true;
  }

  failWith(error: Error): void {
    this.rejection = error;
  }

  deferConnects(): void {
    this.defers = true;
  }

  whenConnectRequested(deviceId: string): Promise<void> {
    if (this.outstandingConnects(deviceId) > 0) return Promise.resolve();
    return new Promise<void>((resolve) => {
      this.requestSignals.set(deviceId, resolve);
    });
  }

  outstandingConnects(deviceId: string): number {
    return this.deferred.get(deviceId)?.length ?? 0;
  }

  settleConnect(deviceId: string): void {
    this.takeLiveConnect(deviceId)?.resolve(handleFor(deviceId));
  }

  settleAbandonedConnect(deviceId: string): void {
    this.takeAbandonedConnect(deviceId)?.resolve(handleFor(deviceId));
  }

  rejectConnect(deviceId: string, error: Error): void {
    this.takeLiveConnect(deviceId)?.reject(error);
  }

  private takeLiveConnect(deviceId: string) {
    return this.takeDeferred(deviceId, (waiting) => waiting.pop());
  }

  private takeAbandonedConnect(deviceId: string) {
    return this.takeDeferred(deviceId, (waiting) => waiting.shift());
  }

  private takeDeferred(
    deviceId: string,
    take: (waiting: DeferredConnect[]) => DeferredConnect | undefined,
  ) {
    const waiting = this.deferred.get(deviceId) ?? [];
    const waiter = take(waiting);
    if (waiting.length === 0) this.deferred.delete(deviceId);
    return waiter;
  }

  async connect(deviceId: string): Promise<DeviceHandle> {
    this.connectCalls.push(deviceId);
    if (this.hangs) return new Promise<DeviceHandle>(() => {});
    if (this.rejection) throw this.rejection;
    if (this.defers) return this.deferConnect(deviceId);
    return handleFor(deviceId);
  }

  private deferConnect(deviceId: string): Promise<DeviceHandle> {
    return new Promise<DeviceHandle>((resolve, reject) => {
      const waiting = this.deferred.get(deviceId) ?? [];
      waiting.push({ resolve, reject });
      this.deferred.set(deviceId, waiting);
      this.requestSignals.get(deviceId)?.();
      this.requestSignals.delete(deviceId);
    });
  }

  async disconnect(device: DeviceHandle): Promise<void> {
    this.disconnectCalls.push(device.id);
  }

  onDisconnected(device: DeviceHandle, listener: () => void): () => void {
    const registered = this.listeners.get(device.id) ?? new Set<() => void>();
    registered.add(listener);
    this.listeners.set(device.id, registered);
    return () => {
      registered.delete(listener);
    };
  }

  dropLink(deviceId: string): void {
    for (const listener of this.listeners.get(deviceId) ?? []) listener();
  }

  watcherCount(deviceId: string): number {
    return this.listeners.get(deviceId)?.size ?? 0;
  }
}

type SessionCall = {
  action: "open" | "bind" | "unbind" | "close";
  key: ModuleKey;
  pairing?: DeviceInfo;
  device?: DeviceHandle;
};

class SpySessions implements ModuleSessions {
  readonly calls: SessionCall[] = [];
  private bindFailure: Error | null = null;

  failBinds(error: Error): void {
    this.bindFailure = error;
  }

  serveBinds(): void {
    this.bindFailure = null;
  }

  open(module: ModuleDescriptor, pairing: DeviceInfo): void {
    this.calls.push({ action: "open", key: module.key, pairing });
  }

  bind(module: ModuleDescriptor, device: DeviceHandle): void {
    this.calls.push({ action: "bind", key: module.key, device });
    if (this.bindFailure) throw this.bindFailure;
  }

  unbind(module: ModuleDescriptor): void {
    this.calls.push({ action: "unbind", key: module.key });
  }

  close(module: ModuleDescriptor): void {
    this.calls.push({ action: "close", key: module.key });
  }

  actionsOn(key: ModuleKey): string[] {
    return this.calls
      .filter((call) => call.key === key)
      .map((call) => call.action);
  }

  callsOn(key: ModuleKey): SessionCall[] {
    return this.calls.filter((call) => call.key === key);
  }
}

function setup() {
  const repository = new StubRepository();
  const connector = new StubConnector();
  const sessions = new SpySessions();
  let clock = 1_000;
  const registry = new ModuleRegistry({
    repository,
    connector,
    sessions,
    now: () => clock,
  });

  return {
    repository,
    connector,
    sessions,
    registry,
    tick: (ms: number) => {
      clock += ms;
      return clock;
    },
    at: () => clock,
  };
}

afterEach(() => {
  vi.useRealTimers();
});

describe("ModuleRegistry", () => {
  it("restores stored pairings at start and connects them, leaving the free slot free", async () => {
    const { repository, connector, sessions, registry } = setup();
    repository.store("water", WATER_DEVICE);
    repository.store("heater", HEATER_DEVICE);

    await registry.start();

    expect(sessions.calls.filter((call) => call.action === "open")).toEqual([
      { action: "open", key: "water", pairing: WATER_DEVICE },
      { action: "open", key: "heater", pairing: HEATER_DEVICE },
    ]);
    expect(sessions.calls.filter((call) => call.action === "bind")).toEqual([
      { action: "bind", key: "water", device: handleFor("water-1") },
      { action: "bind", key: "heater", device: handleFor("heater-1") },
    ]);
    expect(connector.connectCalls).toEqual(["water-1", "heater-1"]);
    expect(registry.slotOf("water").link.status).toBe("online");
    expect(registry.slotOf("heater").link.status).toBe("online");
    expect(registry.slotOf("battery")).toMatchObject({
      pairing: null,
      link: { status: "offline", lastContactAt: null },
    });
  });

  it("connects the restored modules side by side, so a slow one holds up nothing", async () => {
    const { repository, connector, registry } = setup();
    repository.store("water", WATER_DEVICE);
    repository.store("heater", HEATER_DEVICE);
    connector.deferConnects();

    const starting = registry.start();
    await connector.whenConnectRequested("heater-1");

    expect(connector.connectCalls).toEqual(["water-1", "heater-1"]);
    connector.settleConnect("heater-1");
    await flushMicrotasks();

    expect(registry.slotOf("heater").link.status).toBe("online");
    expect(registry.slotOf("water").link.status).toBe("connecting");

    connector.settleConnect("water-1");
    await starting;
  });

  it("keeps the catalogue order and exposes one slot per module", () => {
    const { registry } = setup();

    expect(registry.getValue().map((slot) => slot.module.key)).toEqual([
      "water",
      "heater",
      "battery",
    ]);
  });

  it("persists, opens and connects a newly paired device", async () => {
    const { repository, connector, sessions, registry, at } = setup();

    await registry.pair(
      "water",
      discovered({ id: "water-9", name: "New Water" }, WATER_MODULE),
    );

    expect(repository.writes).toEqual([
      { key: "water", device: { id: "water-9", name: "New Water" } },
    ]);
    expect(sessions.callsOn("water")).toEqual([
      {
        action: "open",
        key: "water",
        pairing: { id: "water-9", name: "New Water" },
      },
      { action: "bind", key: "water", device: handleFor("water-9") },
    ]);
    expect(connector.connectCalls).toEqual(["water-9"]);
    expect(registry.slotOf("water")).toMatchObject({
      pairing: { id: "water-9", name: "New Water" },
      link: { status: "online", since: at() },
    });
  });

  it("notifies subscribers when a slot changes", async () => {
    const { registry } = setup();
    const seen: string[] = [];
    registry.subscribe((slots) => {
      const water = slots.find((slot) => slot.module.key === "water");
      if (water) seen.push(water.link.status);
    });

    await registry.pair(
      "water",
      discovered({ id: "water-9", name: "New Water" }, WATER_MODULE),
    );

    expect(seen).toEqual(["offline", "connecting", "online"]);
  });

  it("refuses a second device on an occupied slot and changes nothing", async () => {
    const { repository, connector, sessions, registry } = setup();
    await registry.pair("water", WATER_SCAN);
    const slotBefore = registry.slotOf("water");

    await expect(
      registry.pair(
        "water",
        discovered({ id: "water-2", name: "Another Water" }, WATER_MODULE),
      ),
    ).rejects.toBeInstanceOf(SlotOccupiedError);

    expect(repository.writes).toHaveLength(1);
    expect(connector.connectCalls).toEqual(["water-1"]);
    expect(sessions.actionsOn("water")).toEqual(["open", "bind"]);
    expect(registry.slotOf("water")).toEqual(slotBefore);
  });

  it("names the occupied slot on the refusal", async () => {
    const { registry } = setup();
    await registry.pair("water", WATER_SCAN);

    const refusal = await registry
      .pair(
        "water",
        discovered({ id: "water-2", name: "Another Water" }, WATER_MODULE),
      )
      .catch((error: unknown) => error);

    expect(refusal).toBeInstanceOf(SlotOccupiedError);
    expect((refusal as SlotOccupiedError).key).toBe("water");
  });

  it("refuses a slot lookup outside the catalogue", () => {
    const { registry } = setup();

    expect(() => registry.slotOf("fridge" as ModuleKey)).toThrow(
      'Unknown module "fridge"',
    );
  });

  it("closes the session, clears storage and frees the slot on unpair", async () => {
    const { repository, connector, sessions, registry } = setup();
    await registry.pair("water", WATER_SCAN);

    await registry.unpair("water");

    expect(sessions.actionsOn("water")).toEqual([
      "open",
      "bind",
      "unbind",
      "close",
    ]);
    expect(connector.disconnectCalls).toEqual(["water-1"]);
    expect(repository.clears).toEqual(["water"]);
    expect(await repository.getLastDevice("water")).toBeNull();
    expect(registry.slotOf("water")).toMatchObject({
      pairing: null,
      link: { status: "offline", lastContactAt: null },
    });
  });

  it("unpairs even when the disconnect fails", async () => {
    const { repository, connector, registry } = setup();
    await registry.pair("water", WATER_SCAN);
    connector.disconnect = async () => {
      throw new Error("radio is gone");
    };

    await registry.unpair("water");

    expect(repository.clears).toEqual(["water"]);
    expect(registry.slotOf("water").pairing).toBeNull();
  });

  it("marks a slot offline on a link drop, unbinding the session without closing it", async () => {
    const { connector, sessions, registry, tick } = setup();
    await registry.pair("water", WATER_SCAN);
    const droppedAt = tick(5_000);

    connector.dropLink("water-1");

    expect(registry.slotOf("water")).toMatchObject({
      pairing: { id: "water-1" },
      link: { status: "offline", lastContactAt: droppedAt },
    });
    expect(sessions.actionsOn("water")).toEqual(["open", "bind", "unbind"]);
    expect(connector.connectCalls).toEqual(["water-1"]);
  });

  it("issues a single connect when reconnect is called twice while connecting", async () => {
    const { connector, registry } = setup();
    await registry.pair("water", WATER_SCAN);
    connector.dropLink("water-1");
    await flushMicrotasks();
    connector.hangForever();

    const connectsBefore = connector.connectCalls.length;

    void registry.reconnect("water");
    void registry.reconnect("water");

    expect(registry.slotOf("water").link.status).toBe("connecting");
    expect(connector.connectCalls.length - connectsBefore).toBe(1);
  });

  it("ignores reconnect while the slot is online", async () => {
    const { connector, registry } = setup();
    await registry.pair("water", WATER_SCAN);

    await registry.reconnect("water");

    expect(connector.connectCalls).toEqual(["water-1"]);
  });

  it("falls back to offline after the connect timeout, keeping the last contact", async () => {
    vi.useFakeTimers();
    const { connector, registry, tick } = setup();
    await registry.pair("water", WATER_SCAN);
    const droppedAt = tick(5_000);
    connector.dropLink("water-1");
    await flushMicrotasks();
    connector.hangForever();

    void registry.reconnect("water");
    expect(registry.slotOf("water").link.status).toBe("connecting");

    await vi.advanceTimersByTimeAsync(15_000);

    expect(registry.slotOf("water").link).toEqual({
      status: "offline",
      lastContactAt: droppedAt,
    });
  });

  it("stays offline with no last contact when the very first connect fails", async () => {
    const { connector, sessions, registry } = setup();
    connector.failWith(new Error("out of range"));

    await registry.pair("water", WATER_SCAN);

    expect(registry.slotOf("water")).toMatchObject({
      pairing: { id: "water-1" },
      link: { status: "offline", lastContactAt: null },
    });
    expect(sessions.actionsOn("water")).toEqual(["open"]);
  });

  it("drops a connect that lands after the slot was unpaired", async () => {
    const { connector, sessions, registry } = setup();
    connector.deferConnects();

    const pairing = registry.pair("water", WATER_SCAN);
    await connector.whenConnectRequested("water-1");
    await registry.unpair("water");

    connector.settleConnect("water-1");
    await pairing;
    await flushMicrotasks();

    expect(registry.slotOf("water")).toMatchObject({
      pairing: null,
      link: { status: "offline", lastContactAt: null },
    });
    expect(sessions.actionsOn("water")).toEqual(["open", "unbind", "close"]);
    expect(connector.disconnectCalls).toEqual(["water-1"]);
    expect(connector.watcherCount("water-1")).toBe(0);
  });

  it("keeps the freed slot untouched when a late connect fails after unpair", async () => {
    const { connector, registry, tick } = setup();
    await registry.pair("water", WATER_SCAN);
    tick(5_000);
    connector.dropLink("water-1");
    connector.deferConnects();

    const reconnecting = registry.reconnect("water");
    await connector.whenConnectRequested("water-1");
    await registry.unpair("water");

    connector.rejectConnect("water-1", new Error("out of range"));
    await reconnecting;

    expect(registry.slotOf("water")).toMatchObject({
      pairing: null,
      link: { status: "offline", lastContactAt: null },
    });
  });

  it("refuses a second pairing issued in the same tick as the first", async () => {
    const { repository, connector, sessions, registry } = setup();

    const first = registry.pair("water", WATER_SCAN);
    const second = registry.pair(
      "water",
      discovered({ id: "water-2", name: "Another Water" }, WATER_MODULE),
    );

    await expect(second).rejects.toBeInstanceOf(SlotOccupiedError);
    await first;

    expect(repository.writes).toEqual([{ key: "water", device: WATER_DEVICE }]);
    expect(connector.connectCalls).toEqual(["water-1"]);
    expect(sessions.actionsOn("water")).toEqual(["open", "bind"]);
    expect(registry.slotOf("water")).toMatchObject({
      pairing: { id: "water-1" },
      link: { status: "online" },
    });
  });

  it("disconnects a connection that lands after the connect timeout", async () => {
    vi.useFakeTimers();
    const { connector, sessions, registry } = setup();
    connector.deferConnects();

    const pairing = registry.pair("water", WATER_SCAN);
    await connector.whenConnectRequested("water-1");
    await vi.advanceTimersByTimeAsync(15_000);
    await pairing;

    connector.settleConnect("water-1");
    await vi.advanceTimersByTimeAsync(0);

    expect(connector.disconnectCalls).toEqual(["water-1"]);
    expect(registry.slotOf("water").link).toEqual({
      status: "offline",
      lastContactAt: null,
    });
    expect(sessions.actionsOn("water")).toEqual(["open"]);
    expect(connector.watcherCount("water-1")).toBe(0);
  });

  it("clears the pending connect timer on dispose", async () => {
    vi.useFakeTimers();
    const { connector, registry } = setup();
    connector.hangForever();

    const pairing = registry.pair("water", WATER_SCAN);
    await vi.advanceTimersByTimeAsync(0);
    expect(registry.slotOf("water").link.status).toBe("connecting");
    expect(vi.getTimerCount()).toBe(1);

    registry.dispose();

    expect(vi.getTimerCount()).toBe(0);
    await pairing;
  });

  it("ignores a reconnect racing the storage clear of an unpair", async () => {
    const { repository, connector, sessions, registry, tick } = setup();
    await registry.pair("water", WATER_SCAN);
    tick(5_000);
    connector.dropLink("water-1");
    await flushMicrotasks();
    repository.blockClears();

    const unpairing = registry.unpair("water");
    await registry.reconnect("water");
    repository.releaseClears();
    await unpairing;

    expect(connector.connectCalls).toEqual(["water-1"]);
    expect(sessions.actionsOn("water")).toEqual([
      "open",
      "bind",
      "unbind",
      "unbind",
      "close",
    ]);
    expect(registry.slotOf("water")).toMatchObject({
      pairing: null,
      link: { status: "offline", lastContactAt: null },
    });
    expect(connector.watcherCount("water-1")).toBe(0);
  });

  it("keeps the replacement paired when it lands during the storage clear of an unpair", async () => {
    const { repository, sessions, registry } = setup();
    const replacement = { id: "water-2", name: "Replacement Water" };
    await registry.pair("water", WATER_SCAN);
    repository.blockClears();

    const unpairing = registry.unpair("water");
    const repairing = registry.pair(
      "water",
      discovered(replacement, WATER_MODULE),
    );
    repository.releaseClears();
    await Promise.all([unpairing, repairing]);

    expect(await repository.getLastDevice("water")).toEqual(replacement);
    expect(repository.clears).toEqual(["water"]);
    expect(registry.slotOf("water")).toMatchObject({
      pairing: replacement,
      link: { status: "online" },
    });
    expect(sessions.actionsOn("water")).toEqual([
      "open",
      "bind",
      "unbind",
      "close",
      "open",
      "bind",
    ]);
  });

  it("keeps the live link when a timed-out connect lands on the same device", async () => {
    vi.useFakeTimers();
    const { connector, sessions, registry } = setup();
    connector.deferConnects();

    const pairing = registry.pair("water", WATER_SCAN);
    await connector.whenConnectRequested("water-1");
    await vi.advanceTimersByTimeAsync(15_000);
    await pairing;
    expect(registry.slotOf("water").link.status).toBe("offline");

    const reconnecting = registry.reconnect("water");
    connector.settleConnect("water-1");
    await reconnecting;
    expect(registry.slotOf("water").link.status).toBe("online");

    connector.settleAbandonedConnect("water-1");
    await vi.advanceTimersByTimeAsync(0);

    expect(connector.disconnectCalls).toEqual([]);
    expect(registry.slotOf("water").link.status).toBe("online");
    expect(sessions.actionsOn("water")).toEqual(["open", "bind"]);
    expect(connector.watcherCount("water-1")).toBe(1);
  });

  it("connects once when start runs twice", async () => {
    const { repository, connector, sessions, registry } = setup();
    repository.store("water", WATER_DEVICE);

    await registry.start();
    await registry.start();

    expect(connector.connectCalls).toEqual(["water-1"]);
    expect(sessions.actionsOn("water")).toEqual(["open", "bind"]);
    expect(connector.watcherCount("water-1")).toBe(1);

    registry.dispose();

    expect(sessions.actionsOn("water")).toEqual(["open", "bind", "close"]);
  });

  it("restores the slots it can read when one repository read fails", async () => {
    const { repository, connector, registry } = setup();
    repository.store("water", WATER_DEVICE);
    repository.store("heater", HEATER_DEVICE);
    const readDevice = repository.getLastDevice.bind(repository);
    repository.getLastDevice = async (key: ModuleKey) => {
      if (key === "water") throw new Error("storage unavailable");
      return readDevice(key);
    };

    await registry.start();

    expect(connector.connectCalls).toEqual(["heater-1"]);
    expect(registry.slotOf("water").pairing).toBeNull();
    expect(registry.slotOf("heater").link.status).toBe("online");
  });

  it("frees the slot again when the pairing cannot be persisted", async () => {
    const { connector, repository, sessions, registry } = setup();
    repository.setLastDevice = async () => {
      throw new Error("storage is full");
    };

    await expect(registry.pair("water", WATER_SCAN)).rejects.toThrow(
      "storage is full",
    );

    expect(registry.slotOf("water")).toMatchObject({
      pairing: null,
      link: { status: "offline", lastContactAt: null },
    });
    expect(sessions.calls).toEqual([]);
    expect(connector.connectCalls).toEqual([]);
  });

  it("binds the handle obtained by a reconnect", async () => {
    const { connector, sessions, registry, tick } = setup();
    await registry.pair("water", WATER_SCAN);
    tick(5_000);
    connector.dropLink("water-1");

    await registry.reconnect("water");

    expect(sessions.callsOn("water")).toEqual([
      { action: "open", key: "water", pairing: WATER_DEVICE },
      { action: "bind", key: "water", device: handleFor("water-1") },
      { action: "unbind", key: "water" },
      { action: "bind", key: "water", device: handleFor("water-1") },
    ]);
    expect(registry.slotOf("water").link).toEqual({
      status: "online",
      since: 6_000,
    });
  });

  it("stays recoverable when the link drops while the watcher is registered", async () => {
    const { connector, sessions, registry, at } = setup();
    const watch = connector.onDisconnected.bind(connector);
    connector.onDisconnected = (device: DeviceHandle, listener: () => void) => {
      const stop = watch(device, listener);
      listener();
      return stop;
    };

    await registry.pair("water", WATER_SCAN);

    expect(registry.slotOf("water").link).toEqual({
      status: "offline",
      lastContactAt: at(),
    });
    expect(sessions.actionsOn("water")).toEqual(["open", "bind", "unbind"]);
    expect(connector.watcherCount("water-1")).toBe(0);
  });

  it("keeps the last contact when a reconnect fails outside any timeout", async () => {
    const { connector, registry, tick } = setup();
    await registry.pair("water", WATER_SCAN);
    const droppedAt = tick(5_000);
    connector.dropLink("water-1");
    connector.failWith(new Error("out of range"));

    await registry.reconnect("water");

    expect(registry.slotOf("water").link).toEqual({
      status: "offline",
      lastContactAt: droppedAt,
    });
  });

  it("stays offline with no last contact when the first bind of a pairing fails", async () => {
    const { connector, sessions, registry } = setup();
    sessions.failBinds(new Error("the device is gone"));

    await registry.pair("water", WATER_SCAN);

    expect(registry.slotOf("water")).toMatchObject({
      pairing: { id: "water-1" },
      link: { status: "offline", lastContactAt: null },
    });
    expect(sessions.actionsOn("water")).toEqual(["open", "bind", "unbind"]);
    expect(connector.watcherCount("water-1")).toBe(0);
    expect(connector.disconnectCalls).toEqual(["water-1"]);
  });

  it("keeps the last contact when the session cannot bind the reconnected device", async () => {
    const { connector, sessions, registry, tick } = setup();
    await registry.pair("water", WATER_SCAN);
    const droppedAt = tick(1_000);
    connector.dropLink("water-1");
    await flushMicrotasks();
    sessions.failBinds(new Error("the device is gone"));
    tick(3_000);

    await registry.reconnect("water");

    expect(registry.slotOf("water").link).toEqual({
      status: "offline",
      lastContactAt: droppedAt,
    });
    expect(sessions.actionsOn("water")).toEqual([
      "open",
      "bind",
      "unbind",
      "bind",
      "unbind",
    ]);
    expect(connector.watcherCount("water-1")).toBe(0);
    expect(connector.disconnectCalls).toEqual(["water-1"]);
  });

  it("comes online again once the session can bind the device", async () => {
    const { connector, sessions, registry, tick } = setup();
    await registry.pair("water", WATER_SCAN);
    connector.dropLink("water-1");
    await flushMicrotasks();
    sessions.failBinds(new Error("the device is gone"));
    await registry.reconnect("water");

    sessions.serveBinds();
    const boundAt = tick(1_000);
    await registry.reconnect("water");

    expect(registry.slotOf("water").link).toEqual({
      status: "online",
      since: boundAt,
    });
    expect(connector.watcherCount("water-1")).toBe(1);
  });

  it("does nothing when unpairing a free slot", async () => {
    const { connector, repository, sessions, registry } = setup();

    await registry.unpair("water");

    expect(repository.clears).toEqual([]);
    expect(sessions.calls).toEqual([]);
    expect(connector.disconnectCalls).toEqual([]);
    expect(registry.slotOf("water")).toMatchObject({
      pairing: null,
      link: { status: "offline", lastContactAt: null },
    });
  });

  it("stops waiting on the pending connect when the slot is unpaired", async () => {
    vi.useFakeTimers();
    const { connector, registry } = setup();
    connector.deferConnects();

    const pairing = registry.pair("water", WATER_SCAN);
    await connector.whenConnectRequested("water-1");
    expect(vi.getTimerCount()).toBe(1);

    await registry.unpair("water");
    await pairing;

    expect(vi.getTimerCount()).toBe(0);
    expect(registry.slotOf("water").pairing).toBeNull();
  });

  it("never binds a connect that lands after dispose", async () => {
    const { connector, sessions, registry } = setup();
    connector.deferConnects();

    const pairing = registry.pair("water", WATER_SCAN);
    await connector.whenConnectRequested("water-1");

    registry.dispose();
    connector.settleConnect("water-1");
    await pairing;
    await flushMicrotasks();

    expect(sessions.actionsOn("water")).toEqual(["open", "close"]);
    expect(registry.slotOf("water").link.status).not.toBe("online");
    expect(connector.disconnectCalls).toEqual(["water-1"]);
    expect(connector.watcherCount("water-1")).toBe(0);
  });

  it("keeps a pairing undone when a subscriber unpairs on the first notify of the pair", async () => {
    const { connector, repository, sessions, registry } = setup();
    const unpairs: Promise<void>[] = [];
    let armed = true;
    registry.subscribe(() => {
      if (!armed) return;
      armed = false;
      unpairs.push(registry.unpair("water"));
    });

    await registry.pair("water", WATER_SCAN);
    await Promise.all(unpairs);
    await flushMicrotasks();

    expect(await repository.getLastDevice("water")).toBeNull();
    expect(repository.clears).toEqual(["water"]);
    expect(sessions.actionsOn("water")).toEqual([
      "open",
      "bind",
      "unbind",
      "close",
    ]);
    expect(registry.slotOf("water")).toMatchObject({
      pairing: null,
      link: { status: "offline", lastContactAt: null },
    });
    expect(connector.watcherCount("water-1")).toBe(0);
  });

  it("frees the slot for good when a subscriber unpairs on the connecting notify of a reconnect", async () => {
    const { connector, sessions, registry, tick } = setup();
    await registry.pair("water", WATER_SCAN);
    tick(5_000);
    connector.dropLink("water-1");

    const unpairs: Promise<void>[] = [];
    let armed = true;
    registry.subscribe((slots) => {
      const water = slots.find((slot) => slot.module.key === "water");
      if (!armed || water?.link.status !== "connecting") return;
      armed = false;
      unpairs.push(registry.unpair("water"));
    });

    await registry.reconnect("water");
    await Promise.all(unpairs);
    await flushMicrotasks();

    expect(sessions.actionsOn("water")).toEqual([
      "open",
      "bind",
      "unbind",
      "bind",
      "unbind",
      "close",
    ]);
    expect(registry.slotOf("water")).toMatchObject({
      pairing: null,
      link: { status: "offline", lastContactAt: null },
    });
    expect(connector.watcherCount("water-1")).toBe(0);
    expect(connector.disconnectCalls).toEqual(["water-1"]);
  });

  it("applies a link drop that fires while the reconnect still holds the queue", async () => {
    const { connector, sessions, registry, tick } = setup();
    await registry.pair("water", WATER_SCAN);
    tick(5_000);
    connector.dropLink("water-1");

    const watch = connector.onDisconnected.bind(connector);
    connector.onDisconnected = (device: DeviceHandle, listener: () => void) => {
      connector.onDisconnected = watch;
      const stop = watch(device, listener);
      listener();
      return stop;
    };
    const droppedAt = tick(1_000);

    await registry.reconnect("water");
    await flushMicrotasks();

    expect(registry.slotOf("water")).toMatchObject({
      pairing: { id: "water-1" },
      link: { status: "offline", lastContactAt: droppedAt },
    });
    expect(sessions.actionsOn("water")).toEqual([
      "open",
      "bind",
      "unbind",
      "bind",
      "unbind",
    ]);
    expect(connector.watcherCount("water-1")).toBe(0);

    await registry.reconnect("water");

    expect(registry.slotOf("water").link.status).toBe("online");
  });

  it("marks the slot offline when the connector throws synchronously", async () => {
    vi.useFakeTimers();
    const { connector, registry, tick } = setup();
    await registry.pair("water", WATER_SCAN);
    const droppedAt = tick(5_000);
    connector.dropLink("water-1");
    connector.connect = () => {
      throw new Error("radio is off");
    };

    await registry.reconnect("water");

    expect(registry.slotOf("water").link).toEqual({
      status: "offline",
      lastContactAt: droppedAt,
    });
    expect(vi.getTimerCount()).toBe(0);
  });

  it("closes every open session and drops every link watcher on dispose", async () => {
    const { connector, sessions, registry } = setup();
    await registry.pair("water", WATER_SCAN);
    await registry.pair("heater", HEATER_SCAN);

    registry.dispose();

    expect(sessions.actionsOn("water")).toEqual(["open", "bind", "close"]);
    expect(sessions.actionsOn("heater")).toEqual(["open", "bind", "close"]);
    expect(connector.watcherCount("water-1")).toBe(0);
    expect(connector.watcherCount("heater-1")).toBe(0);
  });
});
