import { adminScenario } from "@/infrastructure/fake/scenarios/adminScenario";
import type {
  ChannelScenario,
  ModuleScenario,
} from "@/infrastructure/fake/scenarios/Scenario";

type TankReading = {
  volumeLiters: number;
  heightMm: number;
  distanceMm: number;
};

const TANK_CONFIG_WRITE = /^CFG:V=(\d+);H=(\d+)$/;
const VALVE_CONFIG_WRITE = /^CFG:T=(\d+)$/;

const CLEAN_TANK_AT_72_PERCENT: TankReading = {
  volumeLiters: 100,
  heightMm: 200,
  distanceMm: 56,
};

const GREY_TANK_AT_40_PERCENT: TankReading = {
  volumeLiters: 80,
  heightMm: 150,
  distanceMm: 90,
};

const DEFAULT_AUTO_CLOSE_SECONDS = 30;

function tankScenario(reading: TankReading): ChannelScenario {
  let volumeLiters = reading.volumeLiters;
  let heightMm = reading.heightMm;

  return (command) => {
    const written = TANK_CONFIG_WRITE.exec(command);
    if (written) {
      volumeLiters = Number(written[1]);
      heightMm = Number(written[2]);
      return ["OK"];
    }
    if (command !== "CFG?") return [];
    return [`CFG:V=${volumeLiters};H=${heightMm}`, String(reading.distanceMm)];
  };
}

function drainValveScenario(): ChannelScenario {
  let autoCloseSeconds = DEFAULT_AUTO_CLOSE_SECONDS;

  return (command) => {
    const written = VALVE_CONFIG_WRITE.exec(command);
    if (written) {
      autoCloseSeconds = Number(written[1]);
      return ["OK"];
    }
    switch (command) {
      case "CFG?":
        return [`CFG:T=${autoCloseSeconds}`];
      case "OPEN":
        return ["OK", `COUNTDOWN:${autoCloseSeconds}`];
      case "CLOSE":
        return ["CLOSED"];
      default:
        return [];
    }
  };
}

export function waterScenario(): ModuleScenario {
  return {
    "0001": adminScenario(),
    "0002": tankScenario(CLEAN_TANK_AT_72_PERCENT),
    "0003": tankScenario(GREY_TANK_AT_40_PERCENT),
    "0004": drainValveScenario(),
  };
}
