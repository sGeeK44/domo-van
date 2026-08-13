import { describe, expect, it } from "vitest";
import type { Observable } from "@/core/observable";
import { WaterSystem } from "@/domain/water/WaterSystem";
import { FakeModuleTransport } from "@/infrastructure/fake/FakeModuleTransport";
import { waterScenario } from "@/infrastructure/fake/scenarios/waterScenario";

const ADMIN = "0001";
const CLEAN_TANK = "0002";
const GREY_TANK = "0003";
const GREY_VALVE = "0004";

const STATE_CHANGING_FRAMES: Record<string, string> = {
  [ADMIN]: "OK",
  [CLEAN_TANK]: "10",
  [GREY_TANK]: "10",
  [GREY_VALVE]: "COUNTDOWN:7",
};

describe("WaterSystem", () => {
  it("exposes a clean tank level of 72 % without any BLE hardware", () => {
    const transport = new FakeModuleTransport(waterScenario());

    const water = new WaterSystem(transport);

    expect(water.cleanTank.getValue().percentage).toBe(72);
  });

  it("exposes the capacity the module answers on the clean tank channel", () => {
    const transport = new FakeModuleTransport(waterScenario());

    const water = new WaterSystem(transport);

    expect(water.cleanTank.getValue()).toMatchObject({
      capacityLiters: 100,
      heightMm: 200,
      lastDistanceMm: 56,
    });
  });

  it("reads the grey tank from its own channel, not the clean tank one", () => {
    const transport = new FakeModuleTransport(waterScenario());

    const water = new WaterSystem(transport);

    expect(water.greyTank.getValue().percentage).toBe(40);
  });

  it("answers the config probe each leaf sends from its constructor", () => {
    const transport = new FakeModuleTransport(waterScenario());

    new WaterSystem(transport);

    expect(transport.channel(CLEAN_TANK).commands).toEqual(["CFG?"]);
    expect(transport.channel(GREY_TANK).commands).toEqual(["CFG?"]);
    expect(transport.channel(GREY_VALVE).commands).toEqual(["CFG?"]);
  });

  it("takes the auto-close delay from the valve config the module answers", () => {
    const transport = new FakeModuleTransport(waterScenario());

    const water = new WaterSystem(transport);

    expect(water.greyDrainValve.getValue().autoCloseSeconds).toBe(45);
  });

  it("opens the grey valve on the valve channel and starts its countdown", async () => {
    const transport = new FakeModuleTransport(waterScenario());
    const water = new WaterSystem(transport);

    await water.greyDrainValve.open();

    expect(transport.channel(GREY_VALVE).commands).toContain("OPEN");
    expect(water.greyDrainValve.getValue()).toMatchObject({
      position: "open",
      remainingSeconds: 45,
    });
  });

  it("counts down the delay the module kept when it refused a longer one", async () => {
    const transport = new FakeModuleTransport(waterScenario());
    const water = new WaterSystem(transport);
    await water.greyDrainValve.setAutoCloseTime(400);

    await water.greyDrainValve.open();

    expect(water.greyDrainValve.getValue()).toMatchObject({
      autoCloseSeconds: 400,
      remainingSeconds: 45,
    });
  });

  it("closes the grey valve on the valve channel", async () => {
    const transport = new FakeModuleTransport(waterScenario());
    const water = new WaterSystem(transport);
    await water.greyDrainValve.open();

    await water.greyDrainValve.close();

    expect(transport.channel(GREY_VALVE).commands).toContain("CLOSE");
    expect(water.greyDrainValve.getValue()).toMatchObject({
      position: "closed",
      remainingSeconds: 0,
    });
  });

  it("reports the grey valve shut when the module auto-closes it", async () => {
    const transport = new FakeModuleTransport(waterScenario());
    const water = new WaterSystem(transport);
    await water.greyDrainValve.open();

    transport.channel(GREY_VALVE).emit("AUTO_CLOSED");

    expect(water.greyDrainValve.getValue()).toMatchObject({
      position: "closed",
      remainingSeconds: 0,
    });
  });

  it("recomputes the level from the config it just wrote", async () => {
    const transport = new FakeModuleTransport(waterScenario());
    const water = new WaterSystem(transport);

    await water.cleanTank.setConfig("120", "112");

    expect(water.cleanTank.getValue()).toMatchObject({
      capacityLiters: 120,
      heightMm: 112,
      percentage: 50,
    });
  });

  it("takes back the config the module kept when it refused the write", async () => {
    const transport = new FakeModuleTransport(waterScenario());
    const water = new WaterSystem(transport);

    await water.cleanTank.setConfig("120", "20000");
    await water.cleanTank.getConfig();

    expect(water.cleanTank.getValue()).toMatchObject({
      capacityLiters: 100,
      heightMm: 200,
      percentage: 72,
    });
  });

  it("re-issues every constructor probe on resync", () => {
    const transport = new FakeModuleTransport(waterScenario());
    const water = new WaterSystem(transport);

    water.resync();

    expect(transport.channel(CLEAN_TANK).commands).toEqual(["CFG?", "CFG?"]);
    expect(transport.channel(GREY_TANK).commands).toEqual(["CFG?", "CFG?"]);
    expect(transport.channel(GREY_VALVE).commands).toEqual(["CFG?", "CFG?"]);
    expect(transport.channel(ADMIN).commands).toEqual([]);
  });

  it("ignores every frame the module sends once disposed", () => {
    const transport = new FakeModuleTransport(waterScenario());
    const water = new WaterSystem(transport);
    const leaves: Observable<unknown>[] = [
      water.admin,
      water.cleanTank,
      water.greyTank,
      water.greyDrainValve,
    ];
    const notifications: unknown[] = [];
    for (const leaf of leaves) {
      leaf.subscribe((snapshot) => notifications.push(snapshot));
    }
    const before = leaves.map((leaf) => leaf.getValue());

    water.dispose();
    for (const [channelId, frame] of Object.entries(STATE_CHANGING_FRAMES)) {
      transport.channel(channelId).emit(frame);
    }

    expect(leaves.map((leaf) => leaf.getValue())).toEqual(before);
    expect(notifications).toEqual([]);
    for (const channelId of Object.keys(STATE_CHANGING_FRAMES)) {
      expect(transport.channel(channelId).listenerCount).toBe(0);
    }
  });
});
