import { describe, expect, it } from "vitest";
import { WaterSystem } from "@/domain/water/WaterSystem";
import { FakeModuleTransport } from "@/infrastructure/fake/FakeModuleTransport";
import { waterScenario } from "@/infrastructure/fake/scenarios/waterScenario";

const ADMIN = "0001";
const CLEAN_TANK = "0002";
const GREY_TANK = "0003";
const GREY_VALVE = "0004";

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

    expect(water.greyDrainValve.getValue().autoCloseSeconds).toBe(30);
  });

  it("opens the grey valve on the valve channel and starts its countdown", async () => {
    const transport = new FakeModuleTransport(waterScenario());
    const water = new WaterSystem(transport);

    await water.greyDrainValve.open();

    expect(transport.channel(GREY_VALVE).commands).toContain("OPEN");
    expect(water.greyDrainValve.getValue()).toMatchObject({
      position: "open",
      remainingSeconds: 30,
    });
  });

  it("closes the grey valve when the module confirms it", async () => {
    const transport = new FakeModuleTransport(waterScenario());
    const water = new WaterSystem(transport);
    await water.greyDrainValve.open();

    await water.greyDrainValve.close();

    expect(water.greyDrainValve.getValue()).toMatchObject({
      position: "closed",
      remainingSeconds: 0,
    });
  });

  it("recomputes the level from the config it just wrote", async () => {
    const transport = new FakeModuleTransport(waterScenario());
    const water = new WaterSystem(transport);

    await water.cleanTank.setConfig("120", "112");
    await water.cleanTank.getConfig();

    expect(water.cleanTank.getValue()).toMatchObject({
      capacityLiters: 120,
      heightMm: 112,
      percentage: 50,
    });
  });

  it("stops listening on every channel once disposed", () => {
    const transport = new FakeModuleTransport(waterScenario());
    const water = new WaterSystem(transport);

    water.dispose();

    for (const channelId of [ADMIN, CLEAN_TANK, GREY_TANK, GREY_VALVE]) {
      expect(transport.channel(channelId).listenerCount).toBe(0);
    }
  });
});
