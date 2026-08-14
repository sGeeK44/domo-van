import { describe, expect, it } from "vitest";
import { weakestCellIndex } from "@/domain/battery/BatteryTelemetry";

describe("weakestCellIndex", () => {
  it("points at the cell sitting below the rest of the pack", () => {
    expect(weakestCellIndex([3.352, 3.349, 3.361, 3.338])).toBe(3);
  });

  it("points at nothing when the BMS has reported no cell yet", () => {
    expect(weakestCellIndex([])).toBeNull();
  });

  it("resolves a tie to the lowest index, so one cell is marked", () => {
    expect(weakestCellIndex([3.35, 3.338, 3.36, 3.338])).toBe(1);
  });

  it("marks a cell even on a perfectly flat pack", () => {
    expect(weakestCellIndex([3.35, 3.35, 3.35])).toBe(0);
  });
});
