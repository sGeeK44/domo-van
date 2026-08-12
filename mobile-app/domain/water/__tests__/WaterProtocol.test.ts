import { describe, expect, it } from "vitest";
import {
  parseCountdownMessage,
  parseDistanceMessage,
  parseTankConfigMessage,
  parseValveConfigMessage,
} from "@/domain/water/WaterProtocol";

describe("parseTankConfigMessage", () => {
  it("reads the volume and the height of a tank config frame", () => {
    const config = parseTankConfigMessage("CFG:V=120 H=450");

    expect(config).toEqual({ volumeLiters: 120, heightMm: 450 });
  });

  it("ignores the whitespace around the frame", () => {
    const config = parseTankConfigMessage(" CFG:V=1 H=2 ");

    expect(config).toEqual({ volumeLiters: 1, heightMm: 2 });
  });

  it("returns null when the CFG: prefix is missing", () => {
    expect(parseTankConfigMessage("V=120 H=450")).toBeNull();
  });

  it("returns null when a field is not a number", () => {
    expect(parseTankConfigMessage("CFG:V=xx H=450")).toBeNull();
  });

  it("returns null on garbage", () => {
    expect(parseTankConfigMessage("hello")).toBeNull();
  });
});

describe("parseDistanceMessage", () => {
  it("reads a bare distance in millimetres", () => {
    expect(parseDistanceMessage("123")).toBe(123);
  });

  it("accepts a zero distance surrounded by whitespace", () => {
    expect(parseDistanceMessage(" 0 ")).toBe(0);
  });

  it("returns null on a decimal distance", () => {
    expect(parseDistanceMessage("12.3")).toBeNull();
  });

  it("returns null on garbage", () => {
    expect(parseDistanceMessage("x")).toBeNull();
  });
});

describe("parseValveConfigMessage", () => {
  it("reads the auto-close delay of a valve config frame", () => {
    const seconds = parseValveConfigMessage("CFG:T=45");

    expect(seconds).toBe(45);
  });

  it("returns null when the frame carries no T field", () => {
    expect(parseValveConfigMessage("CFG:V=120 H=450")).toBeNull();
  });

  it("returns null on garbage", () => {
    expect(parseValveConfigMessage("T=45")).toBeNull();
  });
});

describe("parseCountdownMessage", () => {
  it("reads the remaining seconds of a countdown frame", () => {
    const seconds = parseCountdownMessage("COUNTDOWN:12");

    expect(seconds).toBe(12);
  });

  it("returns null when the countdown value is not an integer", () => {
    expect(parseCountdownMessage("COUNTDOWN:1.5")).toBeNull();
  });

  it("returns null on garbage", () => {
    expect(parseCountdownMessage("COUNT:12")).toBeNull();
  });
});
