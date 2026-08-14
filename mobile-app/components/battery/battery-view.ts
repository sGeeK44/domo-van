import type { AlarmBannerProps } from "@/design-system";
import {
  type BatterySnapshot,
  calculateRemainingTime,
  formatRemainingTime,
  weakestCellIndex,
} from "@/domain/battery/BatteryTelemetry";
import type { TranslationKey } from "@/i18n/keys";

/** A key and what to interpolate into it: the helper stays pure, the caller translates. */
export type BatteryCopy = {
  key: TranslationKey;
  params?: Record<string, string | number>;
};

export type DeltaTone = "success" | "muted";

export type CellBarView = {
  id: string;
  label: BatteryCopy;
  ratio: number;
  value: string;
};

export type AlarmBannerView = {
  tone: AlarmBannerProps["tone"];
  icon: AlarmBannerProps["icon"];
  /** Joined by the caller, which is the only side that can translate them. */
  messageKeys: readonly TranslationKey[];
};

/** The shortest bar of the cluster: a pack within a few mV still reads as several bars. */
const FLOOR_RATIO = 0.6;

const MILLIVOLTS_PER_VOLT = 1000;
const CELL_DECIMALS = 3;
const READING_DECIMALS = 1;

/**
 * Planning decision 10: the pack's own window mapped onto [FLOOR_RATIO, 1],
 * since no fixed voltage window separates cells 23 mV apart.
 */
export function cellRatio(voltage: number, min: number, max: number): number {
  if (max === min) return 1;
  return FLOOR_RATIO + (1 - FLOOR_RATIO) * ((voltage - min) / (max - min));
}

export function heroLabel(battery: BatterySnapshot): BatteryCopy {
  return {
    key: flowKey(battery),
    params: {
      remaining: Math.round(battery.remainingAh),
      capacity: Math.round(battery.capacityAh),
    },
  };
}

export function heroAside(battery: BatterySnapshot): {
  value: string;
  caption: BatteryCopy;
} {
  const hours = calculateRemainingTime(
    battery.percentage,
    battery.capacityAh,
    battery.current,
  );

  return {
    value: formatRemainingTime(hours),
    caption: {
      key: "battery.detail.power",
      params: { power: Math.round(battery.power) },
    },
  };
}

export function cellsHeader(battery: BatterySnapshot): BatteryCopy {
  // Not named `count`: i18next reads that one as a plural selector.
  return {
    key: "battery.detail.cells",
    params: { cells: battery.cellCount },
  };
}

export function deltaLine(battery: BatterySnapshot): {
  copy: BatteryCopy;
  tone: DeltaTone;
} {
  const params = {
    millivolts: Math.round(battery.cellDelta * MILLIVOLTS_PER_VOLT),
  };

  if (battery.balancing) {
    return {
      copy: { key: "battery.detail.deltaBalancing", params },
      tone: "success",
    };
  }
  return { copy: { key: "battery.detail.delta", params }, tone: "muted" };
}

/** One bar per reported cell: the pack's size comes off the BMS, never from the mockup's four. */
export function cellBars(battery: BatterySnapshot): CellBarView[] {
  const voltages = battery.cellVoltages;
  if (voltages.length === 0) return [];

  const weakest = weakestCellIndex(voltages);
  const min = Math.min(...voltages);
  const max = Math.max(...voltages);

  return voltages.map((voltage, index) => ({
    id: `cell-${index + 1}`,
    // The weakest cell is marked by its label; #5's cluster ranks nothing and dims nothing.
    label: {
      key:
        index === weakest
          ? "battery.detail.weakestCell"
          : "battery.detail.cell",
      params: { index: index + 1 },
    },
    ratio: cellRatio(voltage, min, max),
    value: voltage.toFixed(CELL_DECIMALS),
  }));
}

export function alarmBanner(battery: BatterySnapshot): AlarmBannerView {
  if (battery.alarms.length === 0) {
    return {
      tone: "ok",
      icon: "check-circle",
      messageKeys: ["battery.alarms.none"],
    };
  }

  return {
    tone: "alarm",
    icon: "warning",
    messageKeys: battery.alarms.map(
      (alarm) => `battery.alarms.${alarm}` as const,
    ),
  };
}

export function formatVoltage(volts: number): string {
  return `${volts.toFixed(READING_DECIMALS)} V`;
}

export function formatCurrent(amperes: number): string {
  return `${amperes.toFixed(READING_DECIMALS)} A`;
}

export function formatTemperature(celsius: number): string {
  return `${celsius.toFixed(READING_DECIMALS)}°`;
}

function flowKey(battery: BatterySnapshot): TranslationKey {
  if (battery.isDischarging) return "battery.detail.discharging";
  if (battery.isCharging) return "battery.detail.charging";
  return "battery.detail.idle";
}
