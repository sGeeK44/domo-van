import { describe, expect, it } from "vitest";
import {
  type TankAndValveDraft,
  tankAndValveConfig,
  tankAndValveErrors,
} from "@/components/water-settings/tank-form";

const VALID: TankAndValveDraft = {
  cleanVolume: "100",
  cleanHeight: "200",
  greyVolume: "80",
  greyHeight: "150",
  autoCloseSeconds: "45",
};

function errorsWith(overrides: Partial<TankAndValveDraft>) {
  return tankAndValveErrors({ ...VALID, ...overrides });
}

describe("the tank and valve validation", () => {
  it("passes what the module reports back", () => {
    expect(tankAndValveErrors(VALID)).toEqual({});
  });

  it.each([
    "0",
    "-5",
    "12.5",
    "abc",
    "",
    " ",
  ])("refuses %s as a volume, which must be a positive whole number", (volume) => {
    expect(errorsWith({ cleanVolume: volume })).toEqual({
      cleanVolume: "water.settings.positiveInteger",
    });
  });

  it("marks every field that is wrong, not only the first", () => {
    expect(errorsWith({ cleanVolume: "0", greyHeight: "x" })).toEqual({
      cleanVolume: "water.settings.positiveInteger",
      greyHeight: "water.settings.positiveInteger",
    });
  });

  it("keeps the valve delay within the five minutes the firmware stores", () => {
    expect(errorsWith({ autoCloseSeconds: "300" })).toEqual({});
    expect(errorsWith({ autoCloseSeconds: "301" })).toEqual({
      autoCloseSeconds: "water.settings.atMostFiveMinutes",
    });
  });

  it("reads the delay as a number before it reads it as too long", () => {
    expect(errorsWith({ autoCloseSeconds: "-1" })).toEqual({
      autoCloseSeconds: "water.settings.positiveInteger",
    });
  });
});

describe("the config a draft becomes", () => {
  it("splits the five typed fields over the two tanks and the valve", () => {
    expect(tankAndValveConfig(VALID)).toEqual({
      cleanTank: { volumeLiters: 100, heightMm: 200 },
      greyTank: { volumeLiters: 80, heightMm: 150 },
      autoCloseSeconds: 45,
    });
  });

  it("sends the number, not the spacing around it", () => {
    expect(
      tankAndValveConfig({ ...VALID, cleanVolume: " 120 " }),
    ).toMatchObject({ cleanTank: { volumeLiters: 120, heightMm: 200 } });
  });
});
