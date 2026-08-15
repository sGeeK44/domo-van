import { adminScenario } from "@/infrastructure/fake/scenarios/adminScenario";
import type {
  ChannelScenario,
  ModuleScenario,
} from "@/infrastructure/fake/scenarios/Scenario";

type ZoneReading = {
  temperatureTenths: number;
  setpointTenths: number;
  running: boolean;
};

const PID_WRITE = /^CFG:KP=(\d+);KI=(\d+);KD=(\d+)$/;
const SETPOINT_WRITE = /^SP:(\d+)$/;

// Sanity bounds the firmware refuses to store beyond, see
// heater-module/lib/protocol/HeaterCfgProtocol.cpp.
const MAX_GAIN_HUNDREDTHS = 10000;

const ZONES: readonly ZoneReading[] = [
  { temperatureTenths: 215, setpointTenths: 210, running: true },
  { temperatureTenths: 190, setpointTenths: 195, running: false },
  { temperatureTenths: 175, setpointTenths: 185, running: false },
  { temperatureTenths: 230, setpointTenths: 225, running: true },
];

const ENVIRONMENT_READING = "ENV:T=215;H=450;P=10132;EXT=120";

function outOfGainRange(hundredths: number): boolean {
  return hundredths <= 0 || hundredths > MAX_GAIN_HUNDREDTHS;
}

function heaterZoneScenario(zone: ZoneReading): ChannelScenario {
  let setpointTenths = zone.setpointTenths;
  let pid = { kp: 1000, ki: 10, kd: 50 };
  let running = zone.running;

  const status = () =>
    `STATUS:T=${zone.temperatureTenths};SP=${setpointTenths};RUN=${running ? 1 : 0}`;

  return (command) => {
    const pidWrite = PID_WRITE.exec(command);
    if (pidWrite) {
      const written = {
        kp: Number(pidWrite[1]),
        ki: Number(pidWrite[2]),
        kd: Number(pidWrite[3]),
      };
      if (Object.values(written).some(outOfGainRange)) return ["ERR_CFG_RANGE"];
      pid = written;
      return ["OK"];
    }

    const setpointWrite = SETPOINT_WRITE.exec(command);
    if (setpointWrite) {
      setpointTenths = Number(setpointWrite[1]);
      return ["OK"];
    }

    switch (command) {
      case "STATUS?":
        return [status()];
      case "CFG?":
        return [`CFG:KP=${pid.kp};KI=${pid.ki};KD=${pid.kd}`];
      case "SP?":
        return [`SP:${setpointTenths}`];
      case "START":
        running = true;
        return ["OK", status()];
      case "STOP":
        running = false;
        return ["OK", status()];
      default:
        return [];
    }
  };
}

function environmentScenario(): ChannelScenario {
  return (command) => (command === "ENV?" ? [ENVIRONMENT_READING] : []);
}

export function heaterScenario(): ModuleScenario {
  return {
    "0001": adminScenario(),
    "0002": heaterZoneScenario(ZONES[0]),
    "0003": heaterZoneScenario(ZONES[1]),
    "0004": heaterZoneScenario(ZONES[2]),
    "0005": heaterZoneScenario(ZONES[3]),
    "0006": environmentScenario(),
  };
}
