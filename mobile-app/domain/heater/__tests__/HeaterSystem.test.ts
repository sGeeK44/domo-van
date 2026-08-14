import { describe, expect, it } from "vitest";
import type { Observable } from "@/core/observable";
import {
  MAX_SETPOINT_CELSIUS,
  MIN_SETPOINT_CELSIUS,
  SETPOINT_STEP_CELSIUS,
} from "@/domain/heater/HeaterPresets";
import { HeaterSystem } from "@/domain/heater/HeaterSystem";
import { FakeModuleTransport } from "@/infrastructure/fake/FakeModuleTransport";
import { heaterScenario } from "@/infrastructure/fake/scenarios/heaterScenario";

const ADMIN = "0001";
const ZONE_CHANNELS = ["0002", "0003", "0004", "0005"];
const ZONE_2 = ZONE_CHANNELS[2];
const ZONE_3 = ZONE_CHANNELS[3];
const ENVIRONMENT = "0006";

/** The scenario's own zones: Salon runs at 21.0, Chambre is off at 19.5. */
const SALON = 0;
const CHAMBRE = 1;

function heaterOnFake(): HeaterSystem {
  return new HeaterSystem(new FakeModuleTransport(heaterScenario()));
}

function runningZones(heater: HeaterSystem): boolean[] {
  return heater.zones.map((zone) => zone.getValue().isRunning);
}

function targets(heater: HeaterSystem): number[] {
  return heater.zones.map((zone) => zone.getValue().setpointCelsius);
}

const STATE_CHANGING_FRAMES: Record<string, string> = {
  [ADMIN]: "OK",
  [ZONE_CHANNELS[0]]: "STATUS:T=999;SP=500;RUN=0",
  [ZONE_CHANNELS[1]]: "STATUS:T=999;SP=500;RUN=1",
  [ZONE_CHANNELS[2]]: "STATUS:T=999;SP=500;RUN=1",
  [ZONE_CHANNELS[3]]: "STATUS:T=999;SP=500;RUN=0",
  [ENVIRONMENT]: "ENV:T=10;H=10;P=10;EXT=10",
};

describe("HeaterSystem", () => {
  it("exposes the zone status the module answers, without any BLE hardware", () => {
    const transport = new FakeModuleTransport(heaterScenario());

    const heater = new HeaterSystem(transport);

    expect(heater.getZone(0).getValue()).toMatchObject({
      temperatureCelsius: 21.5,
      setpointCelsius: 21,
      isRunning: true,
    });
  });

  it("gives each zone its own channel", () => {
    const transport = new FakeModuleTransport(heaterScenario());

    const heater = new HeaterSystem(transport);

    const temperatures = heater.zones.map(
      (zone) => zone.getValue().temperatureCelsius,
    );
    expect(temperatures).toEqual([21.5, 19, 17.5, 23]);
  });

  it("answers the status probe each zone sends from its constructor", () => {
    const transport = new FakeModuleTransport(heaterScenario());

    new HeaterSystem(transport);

    for (const channelId of ZONE_CHANNELS) {
      expect(transport.channel(channelId).commands).toEqual(["STATUS?"]);
    }
  });

  it("exposes the environment reading answered to the ENV probe", () => {
    const transport = new FakeModuleTransport(heaterScenario());

    const heater = new HeaterSystem(transport);

    expect(transport.channel(ENVIRONMENT).commands).toEqual(["ENV?"]);
    expect(heater.environment.getValue()).toMatchObject({
      temperatureCelsius: 21.5,
      exteriorTemperatureCelsius: 12,
      humidity: 45,
      pressureHPa: 1013.2,
    });
  });

  it("starts only the zone it was asked to start", async () => {
    const transport = new FakeModuleTransport(heaterScenario());
    const heater = new HeaterSystem(transport);

    await heater.getZone(2).start();

    expect(transport.channel(ZONE_2).commands).toContain("START");
    expect(heater.getZone(2).getValue().isRunning).toBe(true);
    expect(heater.getZone(1).getValue().isRunning).toBe(false);
    expect(heater.getZone(0).getValue().isRunning).toBe(true);
  });

  it("stops only the zone it was asked to stop, and it stays stopped", async () => {
    const transport = new FakeModuleTransport(heaterScenario());
    const heater = new HeaterSystem(transport);

    await heater.getZone(3).stop();
    await heater.getZone(3).getStatus();

    expect(transport.channel(ZONE_3).commands).toContain("STOP");
    expect(heater.getZone(3).getValue().isRunning).toBe(false);
    expect(heater.getZone(0).getValue().isRunning).toBe(true);
  });

  it("writes the setpoint on its own zone channel and the module keeps it", async () => {
    const transport = new FakeModuleTransport(heaterScenario());
    const heater = new HeaterSystem(transport);

    await heater.getZone(2).setSetpoint(23);
    await heater.getZone(2).getStatus();

    expect(transport.channel(ZONE_2).commands).toContain("SP:230");
    expect(heater.getZone(2).getValue()).toMatchObject({
      setpointCelsius: 23,
      temperatureCelsius: 17.5,
    });
    expect(heater.getZone(3).getValue().setpointCelsius).toBe(22.5);
  });

  it("reads back the PID gains the ×100 protocol could carry", async () => {
    const transport = new FakeModuleTransport(heaterScenario());
    const heater = new HeaterSystem(transport);

    await heater.getZone(0).setPidConfig({ kp: 12.567, ki: 0.254, kd: 3.001 });
    await heater.getZone(0).getPidConfig();

    expect(heater.getZone(0).getValue().pidConfig).toEqual({
      kp: 12.57,
      ki: 0.25,
      kd: 3,
    });
  });

  it("refuses a zone index outside the four the module has", () => {
    const transport = new FakeModuleTransport(heaterScenario());
    const heater = new HeaterSystem(transport);

    expect(() => heater.getZone(4)).toThrow("Invalid zone index");
  });

  it("re-issues the status and PID probes of every zone on resync", () => {
    const transport = new FakeModuleTransport(heaterScenario());
    const heater = new HeaterSystem(transport);

    heater.resync();

    for (const channelId of ZONE_CHANNELS) {
      expect(transport.channel(channelId).commands).toEqual([
        "STATUS?",
        "STATUS?",
        "CFG?",
      ]);
    }
    expect(transport.channel(ENVIRONMENT).commands).toEqual(["ENV?", "ENV?"]);
    expect(transport.channel(ADMIN).commands).toEqual([]);
  });

  it("switches a stopped zone back on when its target is adjusted", async () => {
    const heater = heaterOnFake();
    const before = heater.getZone(CHAMBRE).getValue();

    await heater.adjustZone(CHAMBRE, SETPOINT_STEP_CELSIUS);
    await heater.getZone(CHAMBRE).getStatus();

    expect(before.isRunning).toBe(false);
    expect(heater.getZone(CHAMBRE).getValue()).toMatchObject({
      isRunning: true,
      setpointCelsius: before.setpointCelsius + SETPOINT_STEP_CELSIUS,
    });
  });

  it("leaves a running zone running when its target is adjusted", async () => {
    const heater = heaterOnFake();
    const before = heater.getZone(SALON).getValue();

    await heater.adjustZone(SALON, -SETPOINT_STEP_CELSIUS);
    await heater.getZone(SALON).getStatus();

    expect(before.isRunning).toBe(true);
    expect(heater.getZone(SALON).getValue()).toMatchObject({
      isRunning: true,
      setpointCelsius: before.setpointCelsius - SETPOINT_STEP_CELSIUS,
    });
  });

  it("refuses to take a target outside the range the UI allows", async () => {
    const heater = heaterOnFake();

    await heater.adjustZone(SALON, 100);
    await heater.adjustZone(CHAMBRE, -100);
    await heater.zones[SALON].getStatus();
    await heater.zones[CHAMBRE].getStatus();

    expect(targets(heater)[SALON]).toBe(MAX_SETPOINT_CELSIUS);
    expect(targets(heater)[CHAMBRE]).toBe(MIN_SETPOINT_CELSIUS);
  });

  it("lowers the living zones and stops the others on night mode", async () => {
    const heater = heaterOnFake();

    await heater.applyNightMode();
    for (const zone of heater.zones) {
      await zone.getStatus();
    }

    expect(targets(heater).slice(0, 2)).toEqual([18, 17]);
    expect(runningZones(heater)).toEqual([true, true, false, false]);
    expect(heater.nightMode.getValue()).toBe(true);
  });

  it("leaves night mode on a manual adjustment, without rewriting a target", async () => {
    const heater = heaterOnFake();
    await heater.applyNightMode();
    const nightTargets = targets(heater);

    await heater.adjustZone(SALON, SETPOINT_STEP_CELSIUS);

    expect(heater.nightMode.getValue()).toBe(false);
    expect(targets(heater).slice(1)).toEqual(nightTargets.slice(1));
  });

  it("leaves night mode when a zone is powered by hand", async () => {
    const heater = heaterOnFake();
    await heater.applyNightMode();

    await heater.toggleZone(SALON);

    expect(heater.getZone(SALON).getValue().isRunning).toBe(false);
    expect(heater.nightMode.getValue()).toBe(false);
  });

  it("stops every zone and leaves night mode in one action", async () => {
    const heater = heaterOnFake();
    await heater.applyNightMode();

    await heater.stopAll();
    for (const zone of heater.zones) {
      await zone.getStatus();
    }

    expect(runningZones(heater)).toEqual([false, false, false, false]);
    expect(heater.nightMode.getValue()).toBe(false);
  });

  it("ignores every frame the module sends once disposed", () => {
    const transport = new FakeModuleTransport(heaterScenario());
    const heater = new HeaterSystem(transport);
    const leaves: Observable<unknown>[] = [
      heater.admin,
      ...heater.zones,
      heater.environment,
    ];
    const notifications: unknown[] = [];
    for (const leaf of leaves) {
      leaf.subscribe((snapshot) => notifications.push(snapshot));
    }
    const before = leaves.map((leaf) => leaf.getValue());

    heater.dispose();
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
