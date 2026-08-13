import { adminScenario } from "@/infrastructure/fake/scenarios/adminScenario";
import type {
  ChannelScenario,
  ModuleScenario,
} from "@/infrastructure/fake/scenarios/Scenario";

type ZoneReading = {
  temperatureTenths: number;
  setpointTenths: number;
};

const PID_WRITE = /^CFG:KP=(\d+);KI=(\d+);KD=(\d+)$/;
const SETPOINT_WRITE = /^SP:(\d+)$/;

const ZONES: readonly ZoneReading[] = [
  { temperatureTenths: 215, setpointTenths: 210 },
  { temperatureTenths: 190, setpointTenths: 200 },
  { temperatureTenths: 175, setpointTenths: 180 },
  { temperatureTenths: 230, setpointTenths: 220 },
];

const ENVIRONMENT_READING = "ENV:T=215;H=450;P=10132;EXT=120";

function heaterZoneScenario(zone: ZoneReading): ChannelScenario {
  let setpointTenths = zone.setpointTenths;
  let pid = { kp: 1000, ki: 10, kd: 50 };
  let running = false;

  const status = () =>
    `STATUS:T=${zone.temperatureTenths};SP=${setpointTenths};RUN=${running ? 1 : 0}`;

  return (command) => {
    const pidWrite = PID_WRITE.exec(command);
    if (pidWrite) {
      pid = {
        kp: Number(pidWrite[1]),
        ki: Number(pidWrite[2]),
        kd: Number(pidWrite[3]),
      };
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
