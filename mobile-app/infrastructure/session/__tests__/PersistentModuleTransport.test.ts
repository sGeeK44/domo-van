import { describe, expect, it } from "vitest";
import type { Channel } from "@/domain/ports/Channel";
import type { DeviceHandle } from "@/domain/ports/DeviceHandle";
import type { ModuleTransport } from "@/domain/ports/ModuleTransport";
import { WaterSystem } from "@/domain/water/WaterSystem";
import { FakeModuleTransport } from "@/infrastructure/fake/FakeModuleTransport";
import { waterScenario } from "@/infrastructure/fake/scenarios/waterScenario";
import { NotConnectedError } from "@/infrastructure/session/NotConnectedError";
import { PersistentModuleTransport } from "@/infrastructure/session/PersistentModuleTransport";
import { TransportDisposedError } from "@/infrastructure/session/TransportDisposedError";

const CLEAN_TANK = "0002";
const GREY_VALVE = "0004";

const DEVICE: DeviceHandle = { id: "fake-water", name: "Water (fake)" };

/** Half the clean tank height of 200 mm, so the level drops from 72 % to 50 %. */
const HALF_FULL_DISTANCE = "100";

function persistentTransport() {
  const sessions: FakeModuleTransport[] = [];
  const transport = new PersistentModuleTransport(() => {
    const session = new FakeModuleTransport(waterScenario());
    sessions.push(session);
    return session;
  });
  return { transport, sessions };
}

/** A session that refuses one channel, as a stale device handle refuses them all. */
function refusing(session: FakeModuleTransport, channelId: string) {
  return {
    openChannel(id: string): Channel {
      if (id === channelId) throw new Error("device is gone");
      return session.openChannel(id);
    },
  };
}

/** Lets a test break the next session, once a first one is bound. */
function flakyTransport() {
  const sessions: FakeModuleTransport[] = [];
  const broken = { channelId: null as string | null };
  const transport = new PersistentModuleTransport((): ModuleTransport => {
    const session = new FakeModuleTransport(waterScenario());
    sessions.push(session);
    return broken.channelId ? refusing(session, broken.channelId) : session;
  });
  return { transport, sessions, broken };
}

describe("PersistentModuleTransport", () => {
  it("keeps the last known level through a link drop and updates it on the next session", () => {
    const { transport, sessions } = persistentTransport();
    const water = new WaterSystem(transport);

    transport.bind(DEVICE);
    water.resync();
    expect(water.cleanTank.getValue().percentage).toBe(72);

    transport.unbind();
    expect(water.cleanTank.getValue().percentage).toBe(72);

    transport.bind(DEVICE);
    sessions[1].channel(CLEAN_TANK).emit(HALF_FULL_DISTANCE);
    expect(water.cleanTank.getValue().percentage).toBe(50);
  });

  it("listens to the underlying channel exactly once per bind", () => {
    const { transport, sessions } = persistentTransport();
    new WaterSystem(transport);

    transport.bind(DEVICE);
    transport.unbind();
    transport.bind(DEVICE);

    expect(sessions[0].channel(CLEAN_TANK).listenerCount).toBe(0);
    expect(sessions[1].channel(CLEAN_TANK).listenerCount).toBe(1);
  });

  it("drops the previous session when bound again without an unbind", () => {
    const { transport, sessions } = persistentTransport();
    new WaterSystem(transport);

    transport.bind(DEVICE);
    transport.bind(DEVICE);

    expect(sessions[0].channel(CLEAN_TANK).listenerCount).toBe(0);
    expect(sessions[1].channel(CLEAN_TANK).listenerCount).toBe(1);
  });

  it("delivers a frame once after a rebind, not once per session ever opened", () => {
    const { transport, sessions } = persistentTransport();
    const frames: string[] = [];
    transport.openChannel(CLEAN_TANK).listen((frame) => frames.push(frame));

    transport.bind(DEVICE);
    transport.unbind();
    transport.bind(DEVICE);
    sessions[1].channel(CLEAN_TANK).emit(HALF_FULL_DISTANCE);

    expect(frames).toEqual([HALF_FULL_DISTANCE]);
  });

  it("writes on the session bound when a channel was asked for after the bind", async () => {
    const { transport, sessions } = persistentTransport();

    transport.bind(DEVICE);
    await transport.openChannel(GREY_VALVE).send("CFG?");

    expect(sessions[0].channel(GREY_VALVE).commands).toEqual(["CFG?"]);
  });

  it("rejects a write with NotConnectedError while no session is bound", async () => {
    const { transport } = persistentTransport();

    const writing = transport.openChannel(CLEAN_TANK).send("CFG?");

    await expect(writing).rejects.toThrow(NotConnectedError);
  });

  it("rejects a write again once the link has dropped", async () => {
    const { transport } = persistentTransport();
    const channel = transport.openChannel(CLEAN_TANK);
    transport.bind(DEVICE);

    transport.unbind();

    await expect(channel.send("CFG?")).rejects.toThrow(NotConnectedError);
  });

  it("lets a system start unbound, since every constructor probe swallows", () => {
    const { transport } = persistentTransport();

    const water = new WaterSystem(transport);

    expect(water.cleanTank.getValue().percentage).toBe(0);
  });

  it("hands out one proxy per channel id, so a second ask cannot orphan the first listener", () => {
    const { transport, sessions } = persistentTransport();
    const frames: string[] = [];
    transport.openChannel(CLEAN_TANK).listen((frame) => frames.push(frame));

    transport.openChannel(CLEAN_TANK);
    transport.bind(DEVICE);
    sessions[0].channel(CLEAN_TANK).emit(HALF_FULL_DISTANCE);

    expect(frames).toEqual([HALF_FULL_DISTANCE]);
  });

  it("re-pipes every handed-out channel on a rebind, not only the first", () => {
    const { transport, sessions } = persistentTransport();
    const frames: string[] = [];
    transport.openChannel(CLEAN_TANK).listen((f) => frames.push(`tank:${f}`));
    transport.openChannel(GREY_VALVE).listen((f) => frames.push(`valve:${f}`));

    transport.bind(DEVICE);
    transport.unbind();
    transport.bind(DEVICE);
    sessions[1].channel(CLEAN_TANK).emit(HALF_FULL_DISTANCE);
    sessions[1].channel(GREY_VALVE).emit("OK");

    expect(frames).toEqual([`tank:${HALF_FULL_DISTANCE}`, "valve:OK"]);
  });

  it("reads from the session bound when a channel was asked for after the bind", () => {
    const { transport, sessions } = persistentTransport();
    transport.bind(DEVICE);

    const frames: string[] = [];
    transport.openChannel(GREY_VALVE).listen((frame) => frames.push(frame));
    sessions[0].channel(GREY_VALVE).emit("OK");

    expect(frames).toEqual(["OK"]);
  });

  it("keeps reading the previous session when a rebind fails halfway", () => {
    const { transport, sessions, broken } = flakyTransport();
    const frames: string[] = [];
    transport.openChannel(CLEAN_TANK).listen((frame) => frames.push(frame));
    transport.openChannel(GREY_VALVE);
    transport.bind(DEVICE);
    broken.channelId = GREY_VALVE;

    expect(() => transport.bind(DEVICE)).toThrow();

    sessions[0].channel(CLEAN_TANK).emit(HALF_FULL_DISTANCE);
    expect(frames).toEqual([HALF_FULL_DISTANCE]);
  });

  it("keeps writing to the previous session when a rebind fails halfway", async () => {
    const { transport, sessions, broken } = flakyTransport();
    const cleanTank = transport.openChannel(CLEAN_TANK);
    transport.openChannel(GREY_VALVE);
    transport.bind(DEVICE);
    broken.channelId = GREY_VALVE;

    expect(() => transport.bind(DEVICE)).toThrow();

    await cleanTank.send("CFG?");
    expect(sessions[0].channel(CLEAN_TANK).commands).toEqual(["CFG?"]);
  });

  it("unwinds the channels it had already piped when a bind fails halfway", () => {
    const { transport, sessions, broken } = flakyTransport();
    transport.openChannel(CLEAN_TANK);
    transport.openChannel(GREY_VALVE);
    broken.channelId = GREY_VALVE;

    expect(() => transport.bind(DEVICE)).toThrow();

    expect(sessions[0].channel(CLEAN_TANK).listenerCount).toBe(0);
  });

  it("stays unbound when the first bind fails halfway", async () => {
    const { transport, broken } = flakyTransport();
    const cleanTank = transport.openChannel(CLEAN_TANK);
    transport.openChannel(GREY_VALVE);
    broken.channelId = GREY_VALVE;

    expect(() => transport.bind(DEVICE)).toThrow();

    await expect(cleanTank.send("CFG?")).rejects.toThrow(NotConnectedError);
  });

  it("releases the underlying subscriptions when disposed", () => {
    const { transport, sessions } = persistentTransport();
    new WaterSystem(transport);
    transport.bind(DEVICE);

    transport.dispose();

    expect(sessions[0].channel(CLEAN_TANK).listenerCount).toBe(0);
  });

  it("opens no further session once disposed", () => {
    const { transport, sessions } = persistentTransport();
    transport.bind(DEVICE);
    transport.dispose();

    expect(() => transport.bind(DEVICE)).toThrow(TransportDisposedError);
    expect(sessions).toHaveLength(1);
  });

  it("refuses to open a channel once disposed", () => {
    const { transport } = persistentTransport();
    transport.dispose();

    expect(() => transport.openChannel(CLEAN_TANK)).toThrow(
      TransportDisposedError,
    );
  });
});
