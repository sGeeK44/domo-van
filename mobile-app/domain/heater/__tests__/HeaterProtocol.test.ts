import { describe, expect, it } from "vitest";
import {
  parseEnvironmentMessage,
  parsePidConfigMessage,
  parseSetpointMessage,
  parseStatusMessage,
  parseTemperatureNotification,
} from "@/domain/heater/HeaterProtocol";

describe("parseStatusMessage", () => {
  it("reads the temperature, the setpoint and the running flag of a status frame", () => {
    const status = parseStatusMessage("STATUS:T=225;SP=250;RUN=1");

    expect(status).toEqual({
      temperatureCelsius: 22.5,
      setpointCelsius: 25,
      isRunning: true,
    });
  });

  it("reads a negative temperature", () => {
    const status = parseStatusMessage("STATUS:T=-45;SP=200;RUN=0");

    expect(status?.temperatureCelsius).toBe(-4.5);
    expect(status?.isRunning).toBe(false);
  });

  it("returns null when a field is missing", () => {
    expect(parseStatusMessage("STATUS:T=225;SP=250")).toBeNull();
  });

  it("returns null on garbage", () => {
    expect(parseStatusMessage("T=225;SP=250;RUN=1")).toBeNull();
  });
});

describe("parseSetpointMessage", () => {
  it("reads the setpoint of a SP frame as degrees", () => {
    expect(parseSetpointMessage("SP:225")).toBe(22.5);
  });

  it("returns null when the value is not an integer", () => {
    expect(parseSetpointMessage("SP:22.5")).toBeNull();
  });

  it("returns null on garbage", () => {
    expect(parseSetpointMessage("SETPOINT:225")).toBeNull();
  });
});

describe("parseTemperatureNotification", () => {
  it("reads the temperature pushed by a named sensor", () => {
    expect(parseTemperatureNotification("heater_0:T=22.50")).toBe(22.5);
  });

  it("reads a negative temperature", () => {
    expect(parseTemperatureNotification("heater_3:T=-1.25")).toBe(-1.25);
  });

  it("returns null on garbage", () => {
    expect(parseTemperatureNotification("heater_0:T=abc")).toBeNull();
  });
});

describe("parsePidConfigMessage", () => {
  it("reads the three gains of a PID config frame as real values", () => {
    const config = parsePidConfigMessage("CFG:KP=1000;KI=10;KD=50");

    expect(config).toEqual({ kp: 10, ki: 0.1, kd: 0.5 });
  });

  it("returns null when a gain is missing", () => {
    expect(parsePidConfigMessage("CFG:KP=1000;KI=10")).toBeNull();
  });

  it("returns null on garbage", () => {
    expect(parsePidConfigMessage("KP=1000;KI=10;KD=50")).toBeNull();
  });
});

describe("parseEnvironmentMessage", () => {
  it("reads the four readings of an environment frame", () => {
    const env = parseEnvironmentMessage("ENV:T=225;H=450;P=10132;EXT=-35");

    expect(env).toEqual({
      temperatureCelsius: 22.5,
      exteriorTemperatureCelsius: -3.5,
      humidity: 45,
      pressureHPa: 1013.2,
    });
  });

  it("returns null when a reading is missing", () => {
    expect(parseEnvironmentMessage("ENV:T=225;H=450;P=10132")).toBeNull();
  });

  it("returns null on garbage", () => {
    expect(parseEnvironmentMessage("T=225;H=450;P=10132;EXT=-35")).toBeNull();
  });
});
