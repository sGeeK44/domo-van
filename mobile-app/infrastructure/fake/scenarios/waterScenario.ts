import { adminScenario } from "@/infrastructure/fake/scenarios/adminScenario";
import type {
  ChannelScenario,
  ChannelScript,
  ModuleScenario,
} from "@/infrastructure/fake/scenarios/Scenario";

type TankReading = {
  volumeLiters: number;
  heightMm: number;
  distanceMm: number;
};

const TANK_CONFIG_WRITE = /^CFG:V=(\d+);H=(\d+)$/;
const VALVE_CONFIG_WRITE = /^CFG:T=(\d+)$/;

// Sanity bounds the firmware refuses to store beyond, see
// water-module/lib/protocol/{TankCfgProtocol,ValveCfgProtocol}.cpp.
const MAX_VOLUME_LITERS = 5000;
const MAX_HEIGHT_MM = 10000;
const MAX_AUTO_CLOSE_SECONDS = 300;

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

const AUTO_CLOSE_SECONDS = 45;

/** The firmware pushes one COUNTDOWN a second while the valve is open. */
const COUNTDOWN_INTERVAL_MS = 1000;

function tankScenario(reading: TankReading): ChannelScenario {
  let volumeLiters = reading.volumeLiters;
  let heightMm = reading.heightMm;

  return (command) => {
    const written = TANK_CONFIG_WRITE.exec(command);
    if (written) {
      const writtenVolume = Number(written[1]);
      const writtenHeight = Number(written[2]);
      if (writtenVolume > MAX_VOLUME_LITERS || writtenHeight > MAX_HEIGHT_MM) {
        return ["ERR_CFG_RANGE"];
      }
      volumeLiters = writtenVolume;
      heightMm = writtenHeight;
      return ["OK"];
    }
    if (command !== "CFG?") return [];
    return [`CFG:V=${volumeLiters};H=${heightMm}`, String(reading.distanceMm)];
  };
}

function drainValveScript(): ChannelScript {
  let autoCloseSeconds = AUTO_CLOSE_SECONDS;
  let remainingSeconds = 0;

  const respond: ChannelScenario = (command) => {
    const written = VALVE_CONFIG_WRITE.exec(command);
    if (written) {
      const writtenSeconds = Number(written[1]);
      if (writtenSeconds > MAX_AUTO_CLOSE_SECONDS) return ["ERR_CFG_RANGE"];
      autoCloseSeconds = writtenSeconds;
      return ["OK"];
    }
    switch (command) {
      case "CFG?":
        return [`CFG:T=${autoCloseSeconds}`];
      case "OPEN":
        remainingSeconds = autoCloseSeconds;
        return [`COUNTDOWN:${remainingSeconds}`];
      case "CLOSE":
        remainingSeconds = 0;
        return ["CLOSED"];
      default:
        return [];
    }
  };

  // The relay is the module's: it counts itself down and shuts itself, see TankValveListner.cpp.
  const cadence = {
    intervalMs: COUNTDOWN_INTERVAL_MS,
    next: () => {
      if (remainingSeconds <= 0) return [];
      remainingSeconds -= 1;
      return remainingSeconds > 0
        ? [`COUNTDOWN:${remainingSeconds}`]
        : ["AUTO_CLOSED"];
    },
  };

  return { respond, cadence };
}

export function waterScenario(): ModuleScenario {
  return {
    "0001": adminScenario(),
    "0002": tankScenario(CLEAN_TANK_AT_72_PERCENT),
    "0003": tankScenario(GREY_TANK_AT_40_PERCENT),
    "0004": drainValveScript(),
  };
}
