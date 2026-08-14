import { describe, expect, it } from "vitest";
import {
  alarmBanner,
  cellBars,
  cellRatio,
  cellsHeader,
  deltaLine,
  heroAside,
  heroLabel,
} from "@/components/battery/battery-view";
import {
  type BatteryAlarm,
  type BatterySnapshot,
  DEFAULT_BATTERY_SNAPSHOT,
} from "@/domain/battery/BatteryTelemetry";

/** The mockup's pack: four cells 23 mV apart, the fourth being the weakest. */
const MOCKUP_CELLS = [3.352, 3.349, 3.361, 3.338];

const ALL_ALARMS: BatteryAlarm[] = [
  "overvoltage",
  "undervoltage",
  "overcurrent_charge",
  "overcurrent_discharge",
  "overtemp",
  "undertemp",
  "cell_imbalance",
];

function pack(overrides: Partial<BatterySnapshot>): BatterySnapshot {
  return { ...DEFAULT_BATTERY_SNAPSHOT, ...overrides };
}

describe("the height a cell bar gets", () => {
  it("puts the weakest cell of the pack at the floor and the strongest at the top", () => {
    const min = 3.338;
    const max = 3.361;

    expect(cellRatio(min, min, max)).toBeCloseTo(0.6);
    expect(cellRatio(max, min, max)).toBeCloseTo(1);
  });

  it("orders the cells between those two", () => {
    const [ratio1, ratio2, ratio3, ratio4] = cellBars(
      pack({ cellVoltages: MOCKUP_CELLS }),
    ).map((bar) => bar.ratio);

    expect(ratio3).toBeGreaterThan(ratio1);
    expect(ratio1).toBeGreaterThan(ratio2);
    expect(ratio2).toBeGreaterThan(ratio4);
  });

  it("fills a pack with no spread rather than flooring all of it", () => {
    expect(cellRatio(3.3, 3.3, 3.3)).toBe(1);

    const flat = cellBars(pack({ cellVoltages: [3.3, 3.3, 3.3, 3.3] }));

    expect(flat.map((bar) => bar.ratio)).toEqual([1, 1, 1, 1]);
  });

  it("fills a single cell, which is its own minimum and maximum", () => {
    expect(cellBars(pack({ cellVoltages: [3.3] }))[0].ratio).toBe(1);
  });
});

describe("the cells of a pack", () => {
  it("marks the weakest one by its label, and no other", () => {
    const labels = cellBars(pack({ cellVoltages: MOCKUP_CELLS })).map(
      (bar) => bar.label,
    );

    expect(labels.map((label) => label.key)).toEqual([
      "battery.detail.cell",
      "battery.detail.cell",
      "battery.detail.cell",
      "battery.detail.weakestCell",
    ]);
    expect(labels.map((label) => label.params)).toEqual([
      { index: 1 },
      { index: 2 },
      { index: 3 },
      { index: 4 },
    ]);
  });

  it("reads a cell to the millivolt", () => {
    const bars = cellBars(pack({ cellVoltages: [3.3, 3.35] }));

    expect(bars.map((bar) => bar.value)).toEqual(["3.300", "3.350"]);
  });

  it("draws one bar per reported cell, and none for a silent BMS", () => {
    expect(cellBars(pack({ cellVoltages: [3.3, 3.3, 3.3] }))).toHaveLength(3);
    expect(cellBars(pack({ cellVoltages: [] }))).toEqual([]);
  });

  it("counts the bars it draws in its header, not what the pack claims to be", () => {
    const contradiction = pack({
      cellVoltages: [3.3, 3.31, 3.29],
      cellCount: 4,
    });

    expect(cellsHeader(contradiction)).toEqual({
      key: "battery.detail.cells",
      params: { cells: 3 },
    });
    expect(cellBars(contradiction)).toHaveLength(3);
  });

  // A sense wire breaks on cell 2: the marker belongs to cell 4, not to its neighbour.
  it("marks the weakest live cell, and numbers the absent one where it sits", () => {
    const bars = cellBars(pack({ cellVoltages: [3.352, 0, 3.361, 3.338] }));

    expect(bars.map((bar) => bar.label)).toEqual([
      { key: "battery.detail.cell", params: { index: 1 } },
      { key: "battery.detail.cell", params: { index: 2 } },
      { key: "battery.detail.cell", params: { index: 3 } },
      { key: "battery.detail.weakestCell", params: { index: 4 } },
    ]);
    expect(bars.map((bar) => bar.value)).toEqual([
      "3.352",
      "0.000",
      "3.361",
      "3.338",
    ]);
  });

  it("empties the absent cell's bar without dragging the pack's window down to it", () => {
    const ratios = cellBars(
      pack({ cellVoltages: [3.352, 0, 3.361, 3.338] }),
    ).map((bar) => bar.ratio);

    expect(ratios[1]).toBe(0);
    expect(ratios[2]).toBeCloseTo(1);
    expect(ratios[3]).toBeCloseTo(0.6);
  });
});

describe("the balancing line", () => {
  it("states the spread in millivolts, muted, while nothing is balancing", () => {
    expect(deltaLine(pack({ cellDelta: 0.023 }))).toEqual({
      copy: { key: "battery.detail.delta", params: { millivolts: 23 } },
      tone: "muted",
    });
  });

  it("says the balancing is running, in success ink, while it is", () => {
    expect(deltaLine(pack({ cellDelta: 0.023, balancing: true }))).toEqual({
      copy: {
        key: "battery.detail.deltaBalancing",
        params: { millivolts: 23 },
      },
      tone: "success",
    });
  });
});

describe("the hero of the battery screen", () => {
  it("names the direction the charge is moving in", () => {
    expect(heroLabel(pack({ isDischarging: true })).key).toBe(
      "battery.detail.discharging",
    );
    expect(heroLabel(pack({ isCharging: true })).key).toBe(
      "battery.detail.charging",
    );
    expect(heroLabel(pack({})).key).toBe("battery.detail.idle");
  });

  it("puts what is left of the pack against its capacity", () => {
    expect(
      heroLabel(pack({ remainingAh: 164.4, capacityAh: 200 })).params,
    ).toEqual({ remaining: 164, capacity: 200 });
  });

  it("turns the current into a time left and a power", () => {
    const aside = heroAside(
      pack({ percentage: 82, capacityAh: 200, current: -6.6, power: -88.4 }),
    );

    expect(aside.value).toBe("24h 51m");
    expect(aside.caption).toEqual({
      key: "battery.detail.power",
      params: { power: -88 },
    });
  });
});

describe("the alarm banner", () => {
  it("confirms the pack is within its thresholds when nothing is raised", () => {
    expect(alarmBanner(pack({}))).toEqual({
      tone: "ok",
      icon: "check-circle",
      messageKeys: ["battery.alarms.none"],
    });
  });

  it("names every raised alarm through a key of its own", () => {
    const banner = alarmBanner(pack({ alarms: ALL_ALARMS, hasAlarm: true }));

    expect(banner.tone).toBe("alarm");
    expect(banner.icon).toBe("warning");
    expect(banner.messageKeys).toEqual(
      ALL_ALARMS.map((alarm) => `battery.alarms.${alarm}`),
    );
  });
});
