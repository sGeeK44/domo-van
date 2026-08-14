import { describe, expect, it } from "vitest";
import { environmentTiles } from "@/components/home/environment-view";
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
  lastFeedback: null,
};

const silentChannel: Channel = {
  listen: () => () => {},
  send: async () => {},
};

function values(online: boolean, snapshot = MEASURED): string[] {
  return environmentTiles(snapshot, online).map((tile) => tile.value);
}

describe("what the dashboard says about the environment", () => {
  it("shows the four measurements of an online heater", () => {
    expect(values(true)).toEqual(["21.4°", "7.8°", "48%", "1009"]);
  });

  it("labels the four tiles the strip shows, in the mockup's order", () => {
    expect(
      environmentTiles(MEASURED, true).map((tile) => tile.labelKey),
    ).toEqual([
      "dashboard.tiles.interior",
      "dashboard.tiles.exterior",
      "dashboard.tiles.humidity",
      "dashboard.tiles.pressure",
    ]);
  });

  it("shows no measurement while the heater is offline", () => {
    expect(values(false)).toEqual(["-", "-", "-", "-"]);
  });

  it("never presents the state of a heater that was never heard as a reading", () => {
    const unheard = new EnvironmentData(silentChannel).getValue();

    expect(values(false, unheard)).toEqual(["-", "-", "-", "-"]);
  });
});
