import type { BatterySnapshot } from "@/domain/battery/BatteryTelemetry";
import type { TranslationKey } from "@/i18n/keys";

/** A key and an already-formatted number: the helper stays pure, the screen translates. */
export type ReadoutView = {
  labelKey: TranslationKey;
  value: string;
  unit?: string;
};

export type FormCardView = {
  labelKey: TranslationKey;
  readouts: readonly ReadoutView[];
};

const PACK_DECIMALS = 2;
const CAPACITY_DECIMALS = 1;
const CELL_DECIMALS = 3;
const TEMPERATURE_DECIMALS = 1;
const MILLIVOLTS_PER_VOLT = 1000;

export function batteryInfoCards(
  battery: BatterySnapshot,
): readonly FormCardView[] {
  return [
    {
      labelKey: "battery.info.charge",
      readouts: [
        {
          labelKey: "battery.info.state",
          value: `${Math.round(battery.percentage)}`,
          unit: "%",
        },
        {
          labelKey: "battery.info.voltage",
          value: battery.voltage.toFixed(PACK_DECIMALS),
          unit: "V",
        },
        {
          labelKey: "battery.info.current",
          value: battery.current.toFixed(PACK_DECIMALS),
          unit: "A",
        },
      ],
    },
    {
      labelKey: "battery.info.capacity",
      readouts: [
        {
          labelKey: "battery.info.remaining",
          value: battery.remainingAh.toFixed(CAPACITY_DECIMALS),
          unit: "Ah",
        },
        {
          labelKey: "battery.info.nominal",
          value: battery.capacityAh.toFixed(CAPACITY_DECIMALS),
          unit: "Ah",
        },
        {
          labelKey: "battery.info.cycles",
          value: `${battery.cycleCount}`,
        },
      ],
    },
    {
      labelKey: "battery.info.cells",
      readouts: [
        {
          labelKey: "battery.info.maxCell",
          value: battery.maxCellVoltage.toFixed(CELL_DECIMALS),
          unit: "V",
        },
        {
          labelKey: "battery.info.minCell",
          value: battery.minCellVoltage.toFixed(CELL_DECIMALS),
          unit: "V",
        },
        {
          labelKey: "battery.info.delta",
          value: `${Math.round(battery.cellDelta * MILLIVOLTS_PER_VOLT)}`,
          unit: "mV",
        },
      ],
    },
    {
      labelKey: "battery.info.temperatures",
      readouts: [
        {
          labelKey: "battery.info.mosfet",
          value: battery.tempMos.toFixed(TEMPERATURE_DECIMALS),
          unit: "°C",
        },
        {
          labelKey: "battery.info.probe1",
          value: battery.tempCell1.toFixed(TEMPERATURE_DECIMALS),
          unit: "°C",
        },
        {
          labelKey: "battery.info.probe2",
          value: battery.tempCell2.toFixed(TEMPERATURE_DECIMALS),
          unit: "°C",
        },
      ],
    },
  ];
}
