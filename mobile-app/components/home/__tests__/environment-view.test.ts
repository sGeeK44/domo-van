import { describe, expect, it } from "vitest";
import { environmentReadings } from "@/components/home/environment-view";
import {
  EnvironmentData,
  type EnvironmentSnapshot,
} from "@/domain/heater/EnvironmentData";
import type { Channel } from "@/domain/ports/Channel";

const MEASURED: EnvironmentSnapshot = {
  temperatureCelsius: 21.4,
  exteriorTemperatureCelsius: 7.8,
  humidity: 48,
  pressureHPa: 1008.6,
  lastMessage: null,
};

const silentChannel: Channel = {
  listen: () => () => {},
  send: async () => {},
};

function values(online: boolean, snapshot = MEASURED): string[] {
  const readings = environmentReadings(snapshot, online);
  return [
    readings.topLeft.value,
    readings.topRight.value,
    readings.bottomLeft.value,
    readings.bottomRight.value,
  ];
}

describe("what the dashboard says about the environment", () => {
  it("shows the four measurements of an online heater", () => {
    expect(values(true)).toEqual(["21.4°C", "48%", "7.8°C", "1009 hPa"]);
  });

  it("shows no measurement while the heater is offline", () => {
    expect(values(false)).toEqual(["-", "-", "-", "-"]);
  });

  it("never presents the state of a heater that was never heard as a reading", () => {
    const unheard = new EnvironmentData(silentChannel).getValue();

    expect(values(false, unheard)).toEqual(["-", "-", "-", "-"]);
  });
});
