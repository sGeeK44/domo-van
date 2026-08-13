import { describe, expect, it } from "vitest";
import type { DeviceHandle } from "@/domain/ports/DeviceHandle";
import { WaterSystem } from "@/domain/water/WaterSystem";
import { FakeModuleTransport } from "@/infrastructure/fake/FakeModuleTransport";
import { waterScenario } from "@/infrastructure/fake/scenarios/waterScenario";
import { NotConnectedError } from "@/infrastructure/session/NotConnectedError";
import { PersistentModuleTransport } from "@/infrastructure/session/PersistentModuleTransport";

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
});
