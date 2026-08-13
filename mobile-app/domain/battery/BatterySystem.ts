import {
  createObservable,
  Listener,
  Observable,
  Unsubscribe,
} from "@/core/observable";
import { JkBmsFrameReader } from "@/domain/battery/JkBmsFrameReader";
import { buildReadAllCommand, JkBmsData } from "@/domain/battery/JkBmsProtocol";
import type { BinaryTransport } from "@/domain/ports/BinaryTransport";
import {
  BatterySnapshot,
  DEFAULT_BATTERY_SNAPSHOT,
  parseAlarms,
} from "./BatteryTelemetry";

/**
 * BatterySystem manages communication with JK BMS via Bluetooth
 *
 * Uses notification-based streaming for real-time telemetry updates.
 * Implements Observable pattern to integrate with React components.
 */
export class BatterySystem implements Observable<BatterySnapshot> {
  private readonly frameReader = new JkBmsFrameReader();
  private readonly state: ReturnType<typeof createObservable<BatterySnapshot>>;
  private transportUnsub: Unsubscribe | null = null;
  private lastReported: JkBmsData = {};

  constructor(private readonly transport: BinaryTransport) {
    this.state = createObservable<BatterySnapshot>(DEFAULT_BATTERY_SNAPSHOT);

    this.transportUnsub = this.transport.listen(this.onBytes);
    void this.refresh().catch((err) => {
      console.warn("Failed to send initial read command:", err);
    });
  }

  /**
   * Turns a chunk of notification bytes into whatever frames it completed.
   */
  private onBytes = (bytes: Uint8Array): void => {
    for (const frame of this.frameReader.read(bytes)) {
      this.onBmsData(frame);
    }
  };

  /**
   * Get current battery state
   */
  getValue = (): BatterySnapshot => this.state.getValue();

  /**
   * Subscribe to battery state changes
   */
  subscribe = (listener: Listener<BatterySnapshot>): Unsubscribe => {
    return this.state.subscribe(listener);
  };

  /**
   * Request a fresh data update from the BMS
   */
  async refresh(): Promise<void> {
    await this.transport.send(buildReadAllCommand());
  }

  /** Re-issues the read-all the constructor sent, once a link is back. */
  resync = (): void => {
    void this.refresh().catch(() => {});
  };

  /**
   * Handle incoming BMS data and update state
   */
  private onBmsData = (data: JkBmsData): void => {
    this.lastReported = mergeFrames(this.lastReported, data);
    this.state.setValue(toSnapshot(this.lastReported));
  };

  /**
   * Clean up resources
   */
  dispose = (): void => {
    this.transportUnsub?.();
    this.transportUnsub = null;
    this.frameReader.reset();
    this.lastReported = {};
    this.state.destroy();
  };
}

/** Current above which the pack counts as charging, whatever the MOSFET says. */
const CHARGE_CURRENT_THRESHOLD = 0.1;

/** Folds raw fields only, so no derived value can be fed back into itself. */
function mergeFrames(previous: JkBmsData, incoming: JkBmsData): JkBmsData {
  return { ...previous, ...incoming };
}

/** Derives the whole snapshot from the raw fields, with no memory of its own. */
function toSnapshot(data: JkBmsData): BatterySnapshot {
  const cellVoltages = (data.cellVoltages ?? []).filter((v) => v > 0);
  const minCellVoltage =
    cellVoltages.length > 0 ? Math.min(...cellVoltages) : 0;
  const maxCellVoltage =
    cellVoltages.length > 0 ? Math.max(...cellVoltages) : 0;

  const percentage = data.soc ?? 0;
  const voltage = data.totalVoltage ?? 0;
  const current = data.current ?? 0;
  const capacityAh = data.capacityAh ?? 0;
  const alarms = data.errors === undefined ? [] : parseAlarms(data.errors);

  return {
    // Main indicators
    percentage,
    voltage,
    current,
    power: voltage * current,

    // Cell details
    cellVoltages,
    cellCount: data.cellCount ?? 0,
    minCellVoltage,
    maxCellVoltage,
    cellDelta: maxCellVoltage - minCellVoltage,

    // Temperatures
    tempMos: data.tempMos ?? 0,
    tempCell1: data.tempSensor1 ?? 0,
    tempCell2: data.tempSensor2 ?? 0,

    // Capacity
    capacityAh,
    remainingAh: (percentage / 100) * capacityAh,
    cycleCount: data.cycleCount ?? 0,

    // Status
    isCharging:
      (data.isCharging ?? false) || current > CHARGE_CURRENT_THRESHOLD,
    isDischarging:
      (data.isDischarging ?? false) || current < -CHARGE_CURRENT_THRESHOLD,
    balancing: (data.balanceState ?? 0) !== 0,
    balanceCurrent: data.balanceCurrent ?? 0,

    // Alarms
    alarms,
    hasAlarm: alarms.length > 0,

    // Timestamp
    lastUpdate: Date.now(),
  };
}
