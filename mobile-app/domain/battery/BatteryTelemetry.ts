/**
 * Battery alarm types
 */
export type BatteryAlarm =
  | "overvoltage"
  | "undervoltage"
  | "overcurrent_charge"
  | "overcurrent_discharge"
  | "overtemp"
  | "undertemp"
  | "cell_imbalance";

/**
 * Battery snapshot containing all telemetry data
 */
export type BatterySnapshot = {
  // Main indicators (for home screen)
  percentage: number; // SOC 0-100
  voltage: number; // Total pack voltage (V)
  current: number; // Charge/discharge current (A), positive = charging
  power: number; // Calculated power (W), positive = charging

  // Cell details
  cellVoltages: number[]; // Individual cell voltages (V)
  cellCount: number;
  minCellVoltage: number;
  maxCellVoltage: number;
  cellDelta: number; // Difference between min and max cell voltage

  // Temperatures
  tempMos: number; // MOSFET temperature (°C)
  tempCell1: number; // Cell temperature sensor 1 (°C)
  tempCell2: number; // Cell temperature sensor 2 (°C)

  // Capacity
  capacityAh: number; // Nominal capacity in Ah
  remainingAh: number; // Remaining capacity in Ah (calculated)
  cycleCount: number;

  // Status
  isCharging: boolean;
  isDischarging: boolean;
  balancing: boolean;
  balanceCurrent: number; // Balance current in A

  // Alarms
  alarms: BatteryAlarm[];
  hasAlarm: boolean;

  // Connection
  lastUpdate: number | null; // Timestamp of last update
};

/**
 * Default battery snapshot for disconnected state
 */
export const DEFAULT_BATTERY_SNAPSHOT: BatterySnapshot = {
  percentage: 0,
  voltage: 0,
  current: 0,
  power: 0,
  cellVoltages: [],
  cellCount: 0,
  minCellVoltage: 0,
  maxCellVoltage: 0,
  cellDelta: 0,
  tempMos: 0,
  tempCell1: 0,
  tempCell2: 0,
  capacityAh: 0,
  remainingAh: 0,
  cycleCount: 0,
  isCharging: false,
  isDischarging: false,
  balancing: false,
  balanceCurrent: 0,
  alarms: [],
  hasAlarm: false,
  lastUpdate: null,
};

/**
 * Parse error flags from JK BMS into alarm types
 */
export function parseAlarms(errorFlags: number): BatteryAlarm[] {
  const alarms: BatteryAlarm[] = [];

  // Error flag bit definitions (based on JK BMS protocol)
  if (errorFlags & 0x0001) alarms.push("undervoltage");
  if (errorFlags & 0x0002) alarms.push("overvoltage");
  if (errorFlags & 0x0004) alarms.push("overcurrent_discharge");
  if (errorFlags & 0x0008) alarms.push("overcurrent_charge");
  if (errorFlags & 0x0010) alarms.push("undertemp");
  if (errorFlags & 0x0020) alarms.push("overtemp");
  if (errorFlags & 0x0040) alarms.push("cell_imbalance");

  return alarms;
}

/**
 * Calculate remaining time based on current and capacity
 * Returns hours remaining, or null if unable to calculate
 */
export function calculateRemainingTime(
  soc: number,
  capacityAh: number,
  current: number,
): number | null {
  if (capacityAh <= 0 || current === 0) return null;

  const remainingAh = (soc / 100) * capacityAh;

  if (current < 0) {
    // Discharging - calculate time to empty
    return remainingAh / Math.abs(current);
  } else {
    // Charging - calculate time to full
    const missingAh = capacityAh - remainingAh;
    return missingAh / current;
  }
}

/**
 * Format remaining time as a human-readable string
 */
export function formatRemainingTime(hours: number | null): string {
  if (hours === null || !Number.isFinite(hours)) return "-";

  if (hours < 1) {
    const minutes = Math.round(hours * 60);
    return `${minutes}min`;
  }

  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);

  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}
