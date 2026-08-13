import { describe, expect, it } from "vitest";
import { HeaterSystem } from "@/domain/heater/HeaterSystem";
import { FakeModuleTransport } from "@/infrastructure/fake/FakeModuleTransport";
import { heaterScenario } from "@/infrastructure/fake/scenarios/heaterScenario";

const CHANNELS = ["0001", "0002", "0003", "0004", "0005", "0006"];
const ZONE_2 = "0004";
const ENVIRONMENT = "0006";

describe("HeaterSystem", () => {
  it("exposes the zone status the module answers, without any BLE hardware", () => {
    const transport = new FakeModuleTransport(heaterScenario());

    const heater = new HeaterSystem(transport);

    expect(heater.getZone(0).getValue()).toMatchObject({
      temperatureCelsius: 21.5,
      setpointCelsius: 21,
      isRunning: false,
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

    expect(transport.channel(ZONE_2).commands).toEqual(["STATUS?"]);
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
    expect(heater.getZone(0).getValue().isRunning).toBe(false);
  });

  it("still reports a stopped zone once the module has confirmed the stop", async () => {
    const transport = new FakeModuleTransport(heaterScenario());
    const heater = new HeaterSystem(transport);
    await heater.getZone(2).start();

    await heater.getZone(2).stop();
    await heater.getZone(2).getStatus();

    expect(heater.getZone(2).getValue().isRunning).toBe(false);
  });

  it("keeps the setpoint the module echoes back on the next status", async () => {
    const transport = new FakeModuleTransport(heaterScenario());
    const heater = new HeaterSystem(transport);

    await heater.getZone(2).setSetpoint(23);
    await heater.getZone(2).getStatus();

    expect(transport.channel(ZONE_2).commands).toContain("SP:230");
    expect(heater.getZone(2).getValue().setpointCelsius).toBe(23);
  });

  it("reads back the PID gains it wrote", async () => {
    const transport = new FakeModuleTransport(heaterScenario());
    const heater = new HeaterSystem(transport);

    await heater.getZone(0).setPidConfig({ kp: 12.5, ki: 0.25, kd: 3 });
    await heater.getZone(0).getPidConfig();

    expect(heater.getZone(0).getValue().pidConfig).toEqual({
      kp: 12.5,
      ki: 0.25,
      kd: 3,
    });
  });

  it("refuses a zone index outside the four the module has", () => {
    const transport = new FakeModuleTransport(heaterScenario());
    const heater = new HeaterSystem(transport);

    expect(() => heater.getZone(4)).toThrow("Invalid zone index");
  });

  it("stops listening on every channel once disposed", () => {
    const transport = new FakeModuleTransport(heaterScenario());
    const heater = new HeaterSystem(transport);

    heater.dispose();

    for (const channelId of CHANNELS) {
      expect(transport.channel(channelId).listenerCount).toBe(0);
    }
  });
});
