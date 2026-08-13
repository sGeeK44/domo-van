import { describe, expect, it } from "vitest";
import { FRAME } from "@/domain/battery/__tests__/JkBmsFrames";
import { parseResponse } from "@/domain/battery/JkBmsProtocol";
import {
  JK_BMS_BAD_CHECKSUM_FRAME,
  JK_BMS_NOMINAL_FRAME,
  JK_BMS_TRUNCATED_FRAME,
} from "@/infrastructure/fake/scenarios/jkBmsFrames";

describe("the recorded JK BMS corpus", () => {
  it("yields the cell voltages the pack reported", () => {
    const parsed = parseResponse(JK_BMS_NOMINAL_FRAME);

    expect(parsed?.cellVoltages).toEqual([3.3, 3.301, 3.299, 3.302]);
    expect(parsed?.cellCount).toBe(4);
  });

  it("yields the rest of the telemetry the frame carries", () => {
    const parsed = parseResponse(JK_BMS_NOMINAL_FRAME);

    expect(parsed).toMatchObject({ soc: 98, tempMos: 4 });
    expect(parsed?.totalVoltage).toBeCloseTo(13.2, 2);
    expect(parsed?.current).toBeCloseTo(5, 2);
  });

  it("holds the very frame the protocol tests synthesise", () => {
    expect([...JK_BMS_NOMINAL_FRAME]).toEqual(FRAME);
  });

  it("rejects the truncated frame", () => {
    expect(parseResponse(JK_BMS_TRUNCATED_FRAME)).toBeNull();
  });

  it("rejects the frame whose checksum was tampered with", () => {
    expect(parseResponse(JK_BMS_BAD_CHECKSUM_FRAME)).toBeNull();
  });
});
