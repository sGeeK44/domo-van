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

/** PID gains as the protocol carries them: hundredths, whole numbers. */
type PidGains = { kp: number; ki: number; kd: number };

const SETPOINT_WRITE = /^SP:(\d+)$/;

// Sanity bounds the firmware refuses to store beyond, see
// heater-module/lib/protocol/HeaterCfgProtocol.cpp.
const MAX_GAIN_HUNDREDTHS = 10000;

function fieldOf(command: string, key: string): string {
  const written = new RegExp(`${key}=([^;]*)`).exec(command);
  return written ? written[1] : "";
}

function isWholeNumber(value: string): boolean {
  return /^\d+$/.test(value);
}

function outOfGainRange(value: string): boolean {
  const gain = Number(value);
  return gain <= 0 || gain > MAX_GAIN_HUNDREDTHS;
}

/** The frame the firmware answers a PID write with, error codes included. */
function pidWriteAnswer(command: string): { ack: string; gains?: PidGains } {
  const written = ["KP", "KI", "KD"].map((key) => fieldOf(command, key));
  if (written.some((value) => value === "")) return { ack: "ERR_CFG_FMT" };
  if (!written.every(isWholeNumber)) return { ack: "ERR_CFG_NUM" };
  if (written.some(outOfGainRange)) return { ack: "ERR_CFG_RANGE" };

  const [kp, ki, kd] = written.map(Number);
  return { ack: "OK", gains: { kp, ki, kd } };
}

const ZONES: readonly ZoneReading[] = [
  { temperatureTenths: 215, setpointTenths: 210, running: true },
  { temperatureTenths: 190, setpointTenths: 195, running: false },
  { temperatureTenths: 175, setpointTenths: 185, running: false },
  { temperatureTenths: 230, setpointTenths: 225, running: true },
];

const ENVIRONMENT_READING = "ENV:T=215;H=450;P=10132;EXT=120";

function heaterZoneScenario(zone: ZoneReading): ChannelScenario {
  let setpointTenths = zone.setpointTenths;
  let pid = { kp: 1000, ki: 10, kd: 50 };
  let running = zone.running;

  const status = () =>
    `STATUS:T=${zone.temperatureTenths};SP=${setpointTenths};RUN=${running ? 1 : 0}`;

  return (command) => {
    if (command !== "CFG?" && command.startsWith("CFG:")) {
      const answer = pidWriteAnswer(command);
      if (answer.gains) pid = answer.gains;
      return [answer.ack];
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
