import { afterEach, describe, expect, it, vi } from "vitest";
import type { Observable } from "@/core/observable";
import { DEFAULT_WRITE_TIMEOUT_MS } from "@/domain/ConfirmedWrite";
import { SAVED } from "@/domain/Feedback";
import {
  type TankAndValveConfig,
  WaterSystem,
} from "@/domain/water/WaterSystem";
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

const NEW_CONFIG: TankAndValveConfig = {
  cleanTank: { volumeLiters: 120, heightMm: 112 },
  greyTank: { volumeLiters: 90, heightMm: 150 },
  autoCloseSeconds: 60,
};

describe("WaterSystem", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

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

  it("keeps the delay the module kept when it refused a longer one", async () => {
    const transport = new FakeModuleTransport(waterScenario());
    const water = new WaterSystem(transport);
    await water.greyDrainValve.setAutoCloseTime(400);

    await water.greyDrainValve.open();

    expect(water.greyDrainValve.getValue()).toMatchObject({
      autoCloseSeconds: 45,
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

  it("recomputes the level from the config the module acknowledged", async () => {
    const transport = new FakeModuleTransport(waterScenario());
    const water = new WaterSystem(transport);

    await water.cleanTank.setConfig("120", "112");

    expect(water.cleanTank.getValue()).toMatchObject({
      capacityLiters: 120,
      heightMm: 112,
      percentage: 50,
    });
  });

  it("keeps the config the module reported when it refuses the write", async () => {
    const transport = new FakeModuleTransport(waterScenario());
    const water = new WaterSystem(transport);

    const outcome = await water.cleanTank.setConfig("120", "20000");

    expect(outcome).toEqual({ status: "rejected", code: "ERR_CFG_RANGE" });
    expect(water.cleanTank.getValue()).toMatchObject({
      capacityLiters: 100,
      heightMm: 200,
      percentage: 72,
    });
  });

  it("refuses a volume below the bound the firmware keeps", async () => {
    const transport = new FakeModuleTransport(waterScenario());
    const water = new WaterSystem(transport);

    const outcome = await water.cleanTank.saveConfig({
      volumeLiters: 0,
      heightMm: 200,
    });

    expect(outcome).toEqual({ status: "rejected", code: "ERR_CFG_RANGE" });
  });

  it("tells the user when a tank config never left the phone", async () => {
    const transport = new FakeModuleTransport(waterScenario());
    const water = new WaterSystem(transport);
    transport.channel(CLEAN_TANK).failWrites();

    const outcome = await water.cleanTank.setConfig("120", "112");

    expect(outcome).toEqual({ status: "unreachable" });
    expect(water.cleanTank.getValue()).toMatchObject({
      capacityLiters: 100,
      lastFeedback: { key: "common.feedback.unreachable" },
    });
  });

  it("saves the tanks and the valve as one form, one write per field", async () => {
    const transport = new FakeModuleTransport(waterScenario());
    const water = new WaterSystem(transport);

    const outcome = await water.saveTankAndValveConfig(NEW_CONFIG);

    expect(outcome).toEqual({ status: "applied" });
    expect(transport.channel(CLEAN_TANK).commands).toEqual([
      "CFG?",
      "CFG:V=120;H=112",
    ]);
    expect(transport.channel(GREY_TANK).commands).toEqual([
      "CFG?",
      "CFG:V=90;H=150",
    ]);
    expect(transport.channel(GREY_VALVE).commands).toEqual([
      "CFG?",
      "CFG:T=60",
    ]);
  });

  it("holds every saved value the module kept", async () => {
    const transport = new FakeModuleTransport(waterScenario());
    const water = new WaterSystem(transport);

    await water.saveTankAndValveConfig(NEW_CONFIG);

    expect(water.cleanTank.getValue()).toMatchObject({
      capacityLiters: 120,
      heightMm: 112,
    });
    expect(water.greyTank.getValue()).toMatchObject({
      capacityLiters: 90,
      heightMm: 150,
    });
    expect(water.greyDrainValve.getValue().autoCloseSeconds).toBe(60);
  });

  it("names every field the module refused, and writes the others anyway", async () => {
    const transport = new FakeModuleTransport(waterScenario());
    const water = new WaterSystem(transport);

    const outcome = await water.saveTankAndValveConfig({
      ...NEW_CONFIG,
      cleanTank: { volumeLiters: 120, heightMm: 20_000 },
      autoCloseSeconds: 400,
    });

    expect(outcome).toEqual({
      status: "failed",
      failures: [
        {
          field: "water.cleanTank",
          outcome: { status: "rejected", code: "ERR_CFG_RANGE" },
        },
        {
          field: "water.valve",
          outcome: { status: "rejected", code: "ERR_CFG_RANGE" },
        },
      ],
    });
    expect(transport.channel(GREY_TANK).commands).toContain("CFG:V=90;H=150");
    expect(water.greyTank.getValue().capacityLiters).toBe(90);
  });

  it("reports a save the module never answered, without a real wait", async () => {
    vi.useFakeTimers();
    const clock = { millis: 0 };
    const transport = new FakeModuleTransport(waterScenario());
    const water = new WaterSystem(transport, () => clock.millis);
    transport.channel(GREY_VALVE).goSilent();

    const saving = water.saveTankAndValveConfig(NEW_CONFIG);
    await vi.advanceTimersByTimeAsync(0);
    // one window for the write, one for the readback the silent module ignores too
    for (let window = 0; window < 2; window += 1) {
      clock.millis += DEFAULT_WRITE_TIMEOUT_MS;
      await vi.advanceTimersByTimeAsync(DEFAULT_WRITE_TIMEOUT_MS);
    }

    await expect(saving).resolves.toEqual({
      status: "failed",
      failures: [{ field: "water.valve", outcome: { status: "timedOut" } }],
    });
    expect(water.greyDrainValve.getValue().lastFeedback).toEqual({
      key: "common.feedback.notAnswered",
    });
  });

  it("saves the water identity under the water's own field keys", async () => {
    const transport = new FakeModuleTransport(waterScenario());
    const water = new WaterSystem(transport);

    const outcome = await water.admin.saveIdentity({ name: "Eau", pin: "12" });

    expect(outcome).toMatchObject({ failures: [{ field: "water.identity" }] });
    expect(transport.channel(ADMIN).commands).toEqual(["ID:NAME=Eau;PIN=12"]);
  });

  it("lets no stray OK claim a save nobody asked for", () => {
    const transport = new FakeModuleTransport(waterScenario());
    const water = new WaterSystem(transport);

    transport.channel(GREY_VALVE).emit("OK");

    expect(water.greyDrainValve.getValue()).toMatchObject({
      lastFeedback: null,
      autoCloseSeconds: 45,
    });
  });

  it("says saved only when its own write was the one acknowledged", async () => {
    const transport = new FakeModuleTransport(waterScenario());
    const water = new WaterSystem(transport);

    await water.greyDrainValve.setAutoCloseTime(60);

    expect(water.greyDrainValve.getValue()).toMatchObject({
      lastFeedback: SAVED,
      autoCloseSeconds: 60,
    });
  });

  it("holds the last written config after a save whose ack was lost", async () => {
    vi.useFakeTimers();
    const clock = { millis: 0 };
    const transport = new FakeModuleTransport(waterScenario());
    const water = new WaterSystem(transport, () => clock.millis);
    const channel = transport.channel(CLEAN_TANK);

    channel.goSilent();
    const lost = water.cleanTank.saveConfig({
      volumeLiters: 120,
      heightMm: 112,
    });
    await vi.advanceTimersByTimeAsync(0);
    clock.millis += DEFAULT_WRITE_TIMEOUT_MS;
    await vi.advanceTimersByTimeAsync(DEFAULT_WRITE_TIMEOUT_MS);
    channel.speakAgain();
    channel.emit("CFG:V=120;H=112");
    expect(await lost).toEqual({ status: "applied" });

    for (const volume of [130, 140, 150, 160, 170, 180]) {
      const healthy = await water.cleanTank.saveConfig({
        volumeLiters: volume,
        heightMm: 112,
      });
      expect(healthy).toEqual({ status: "applied" });
    }
    expect(water.cleanTank.getValue()).toMatchObject({
      capacityLiters: 180,
      heightMm: 112,
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
