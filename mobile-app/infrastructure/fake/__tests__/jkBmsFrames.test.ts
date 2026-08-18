import { describe, expect, it } from "vitest";
import { cellInfoFrame } from "@/domain/battery/__tests__/JkBmsFrames";
import { JkBmsFrameReader } from "@/domain/battery/JkBmsFrameReader";
import { parseCellInfo } from "@/domain/battery/JkBmsProtocol";
import {
  JK_BMS_BAD_CHECKSUM_FRAME,
  JK_BMS_NOMINAL_FRAME,
  JK_BMS_TRUNCATED_FRAME,
} from "@/infrastructure/fake/scenarios/jkBmsFrames";

describe("the recorded JK BMS corpus", () => {
  it("yields the cell voltages the pack reported", () => {
    const parsed = parseCellInfo(JK_BMS_NOMINAL_FRAME);

    expect(parsed?.cellVoltages).toEqual([3.3, 3.301, 3.299, 3.302]);
  });

  it("yields the rest of the telemetry the frame carries", () => {
    const parsed = parseCellInfo(JK_BMS_NOMINAL_FRAME);

    expect(parsed?.soc).toBe(98);
    expect(parsed?.voltage).toBeCloseTo(13.2, 3);
    expect(parsed?.current).toBeCloseTo(5, 2);
    expect(parsed?.tempMos).toBeCloseTo(23.1, 1);
  });

  it("holds the very frame the protocol tests' builder synthesises", () => {
    expect([...JK_BMS_NOMINAL_FRAME]).toEqual(
      cellInfoFrame({
        cellVoltagesMv: [3300, 3301, 3299, 3302],
        batteryVoltageMv: 13200,
        powerMw: 66000,
        currentMa: 5000,
        soc: 98,
        remainingMah: 98000,
        nominalMah: 100000,
      }),
    );
  });

  it("never completes a frame out of the truncated one alone", () => {
    expect(new JkBmsFrameReader().read(JK_BMS_TRUNCATED_FRAME)).toHaveLength(0);
  });

  it("rejects the frame whose checksum was tampered with", () => {
    expect(new JkBmsFrameReader().read(JK_BMS_BAD_CHECKSUM_FRAME)).toHaveLength(
      0,
    );
  });
});
