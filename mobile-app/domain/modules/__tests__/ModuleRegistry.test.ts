import { afterEach, describe, expect, it, vi } from "vitest";
import type {
  ModuleDescriptor,
  ModuleKey,
} from "@/domain/modules/ModuleDescriptor";
import {
  ModuleRegistry,
  SlotOccupiedError,
} from "@/domain/modules/ModuleRegistry";
import type { DeviceConnector } from "@/domain/ports/DeviceConnector";
import type { DeviceHandle } from "@/domain/ports/DeviceHandle";
import type {
  DeviceInfo,
  DeviceRepository,
} from "@/domain/ports/DeviceRepository";
import type { ModuleSessions } from "@/domain/ports/ModuleSessions";

const WATER_DEVICE = { id: "water-1", name: "Water Module" };
const HEATER_DEVICE = { id: "heater-1", name: "Heater Module" };

class StubRepository implements DeviceRepository {
  private readonly stored = new Map<ModuleKey, DeviceInfo>();
  readonly writes: { key: ModuleKey; device: DeviceInfo }[] = [];
  readonly clears: ModuleKey[] = [];

  store(key: ModuleKey, device: DeviceInfo): void {
    this.stored.set(key, device);
  }

  async getLastDevice(moduleKey: ModuleKey): Promise<DeviceInfo | null> {
    return this.stored.get(moduleKey) ?? null;
  }

  async setLastDevice(device: DeviceInfo, moduleKey: ModuleKey): Promise<void> {
    this.stored.set(moduleKey, device);
    this.writes.push({ key: moduleKey, device });
  }

  async clearLastDevice(moduleKey: ModuleKey): Promise<void> {
    this.stored.delete(moduleKey);
    this.clears.push(moduleKey);
  }
}

class StubConnector implements DeviceConnector {
  readonly connectCalls: string[] = [];
  readonly disconnectCalls: string[] = [];
  private readonly listeners = new Map<string, Set<() => void>>();
  private readonly deferred = new Map<
    string,
    { resolve: (handle: DeviceHandle) => void; reject: (error: Error) => void }
  >();
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
    if (this.deferred.has(deviceId)) return Promise.resolve();
    return new Promise<void>((resolve) => {
      this.requestSignals.set(deviceId, resolve);
    });
  }

  settleConnect(deviceId: string): void {
    const waiter = this.takeDeferred(deviceId);
    waiter?.resolve({ id: deviceId, name: `handle:${deviceId}` });
  }

  rejectConnect(deviceId: string, error: Error): void {
    const waiter = this.takeDeferred(deviceId);
    waiter?.reject(error);
  }

  private takeDeferred(deviceId: string) {
    const waiter = this.deferred.get(deviceId);
    this.deferred.delete(deviceId);
    return waiter;
  }

  async connect(deviceId: string): Promise<DeviceHandle> {
    this.connectCalls.push(deviceId);
    if (this.hangs) return new Promise<DeviceHandle>(() => {});
    if (this.rejection) throw this.rejection;
    if (this.defers) return this.deferConnect(deviceId);
    return { id: deviceId, name: `handle:${deviceId}` };
  }

  private deferConnect(deviceId: string): Promise<DeviceHandle> {
    return new Promise<DeviceHandle>((resolve, reject) => {
      this.deferred.set(deviceId, { resolve, reject });
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

type SessionCall = { action: string; key: ModuleKey };

class SpySessions implements ModuleSessions {
  readonly calls: SessionCall[] = [];

  open(module: ModuleDescriptor): void {
    this.calls.push({ action: "open", key: module.key });
  }

  bind(module: ModuleDescriptor): void {
    this.calls.push({ action: "bind", key: module.key });
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
      { action: "open", key: "water" },
      { action: "open", key: "heater" },
    ]);
    expect(connector.connectCalls).toEqual(["water-1", "heater-1"]);
    expect(registry.slotOf("water").link.status).toBe("online");
    expect(registry.slotOf("heater").link.status).toBe("online");
    expect(registry.slotOf("battery")).toMatchObject({
      pairing: null,
      link: { status: "offline", lastContactAt: null },
    });
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

    await registry.pair("water", { id: "water-9", name: "New Water" });

    expect(repository.writes).toEqual([
      { key: "water", device: { id: "water-9", name: "New Water" } },
    ]);
    expect(sessions.actionsOn("water")).toEqual(["open", "bind"]);
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

    await registry.pair("water", { id: "water-9", name: "New Water" });

    expect(seen).toEqual(["offline", "connecting", "online"]);
  });

  it("refuses a second device on an occupied slot and changes nothing", async () => {
    const { repository, connector, sessions, registry } = setup();
    await registry.pair("water", WATER_DEVICE);
    const slotBefore = registry.slotOf("water");

    await expect(
      registry.pair("water", { id: "water-2", name: "Another Water" }),
    ).rejects.toBeInstanceOf(SlotOccupiedError);

    expect(repository.writes).toHaveLength(1);
    expect(connector.connectCalls).toEqual(["water-1"]);
    expect(sessions.actionsOn("water")).toEqual(["open", "bind"]);
    expect(registry.slotOf("water")).toEqual(slotBefore);
  });

  it("closes the session, clears storage and frees the slot on unpair", async () => {
    const { repository, connector, sessions, registry } = setup();
    await registry.pair("water", WATER_DEVICE);

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
    await registry.pair("water", WATER_DEVICE);
    connector.disconnect = async () => {
      throw new Error("radio is gone");
    };

    await registry.unpair("water");

    expect(repository.clears).toEqual(["water"]);
    expect(registry.slotOf("water").pairing).toBeNull();
  });

  it("marks a slot offline on a link drop, unbinding the session without closing it", async () => {
    const { connector, sessions, registry, tick } = setup();
    await registry.pair("water", WATER_DEVICE);
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
    await registry.pair("water", WATER_DEVICE);
    connector.dropLink("water-1");
    connector.hangForever();

    const connectsBefore = connector.connectCalls.length;

    void registry.reconnect("water");
    void registry.reconnect("water");

    expect(registry.slotOf("water").link.status).toBe("connecting");
    expect(connector.connectCalls.length - connectsBefore).toBe(1);
  });

  it("ignores reconnect while the slot is online", async () => {
    const { connector, registry } = setup();
    await registry.pair("water", WATER_DEVICE);

    await registry.reconnect("water");

    expect(connector.connectCalls).toEqual(["water-1"]);
  });

  it("falls back to offline after the connect timeout, keeping the last contact", async () => {
    vi.useFakeTimers();
    const { connector, registry, tick } = setup();
    await registry.pair("water", WATER_DEVICE);
    const droppedAt = tick(5_000);
    connector.dropLink("water-1");
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

    await registry.pair("water", WATER_DEVICE);

    expect(registry.slotOf("water")).toMatchObject({
      pairing: { id: "water-1" },
      link: { status: "offline", lastContactAt: null },
    });
    expect(sessions.actionsOn("water")).toEqual(["open"]);
  });

  it("drops a connect that lands after the slot was unpaired", async () => {
    const { connector, sessions, registry } = setup();
    connector.deferConnects();

    const pairing = registry.pair("water", WATER_DEVICE);
    await connector.whenConnectRequested("water-1");
    await registry.unpair("water");

    connector.settleConnect("water-1");
    await pairing;

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
    await registry.pair("water", WATER_DEVICE);
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

    const first = registry.pair("water", WATER_DEVICE);
    const second = registry.pair("water", {
      id: "water-2",
      name: "Another Water",
    });

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

    const pairing = registry.pair("water", WATER_DEVICE);
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

    const pairing = registry.pair("water", WATER_DEVICE);
    await vi.advanceTimersByTimeAsync(0);
    expect(registry.slotOf("water").link.status).toBe("connecting");
    expect(vi.getTimerCount()).toBe(1);

    registry.dispose();

    expect(vi.getTimerCount()).toBe(0);
    await pairing;
  });

  it("closes every open session and drops every link watcher on dispose", async () => {
    const { connector, sessions, registry } = setup();
    await registry.pair("water", WATER_DEVICE);
    await registry.pair("heater", HEATER_DEVICE);

    registry.dispose();

    expect(sessions.actionsOn("water")).toEqual(["open", "bind", "close"]);
    expect(sessions.actionsOn("heater")).toEqual(["open", "bind", "close"]);
    expect(connector.watcherCount("water-1")).toBe(0);
    expect(connector.watcherCount("heater-1")).toBe(0);
  });
});
