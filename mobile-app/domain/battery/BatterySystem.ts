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

  /**
   * Handle incoming BMS data and update state
   */
  private onBmsData = (data: JkBmsData): void => {
    this.state.setValue(applyFrame(this.state.getValue(), data));
  };

  /**
   * Clean up resources
   */
  dispose = (): void => {
    this.transportUnsub?.();
    this.transportUnsub = null;
    this.frameReader.reset();
    this.state.destroy();
  };
}

/** Current above which the pack counts as charging, whatever the MOSFET says. */
const CHARGE_CURRENT_THRESHOLD = 0.1;

/** Folds a frame into the last snapshot: a field the frame omits keeps its previous value. */
function applyFrame(
  previous: BatterySnapshot,
  data: JkBmsData,
): BatterySnapshot {
  const cellVoltages = data.cellVoltages
    ? data.cellVoltages.filter((v) => v > 0)
    : previous.cellVoltages;
  const minCellVoltage =
    cellVoltages.length > 0 ? Math.min(...cellVoltages) : 0;
  const maxCellVoltage =
    cellVoltages.length > 0 ? Math.max(...cellVoltages) : 0;

  const percentage = data.soc ?? previous.percentage;
  const voltage = data.totalVoltage ?? previous.voltage;
  const current = data.current ?? previous.current;
  const capacityAh = data.capacityAh ?? previous.capacityAh;
  const alarms =
    data.errors === undefined ? previous.alarms : parseAlarms(data.errors);

  return {
    // Main indicators
    percentage,
    voltage,
    current,
    power: voltage * current,

    // Cell details
    cellVoltages,
    cellCount: data.cellCount ?? previous.cellCount,
    minCellVoltage,
    maxCellVoltage,
    cellDelta: maxCellVoltage - minCellVoltage,

    // Temperatures
    tempMos: data.tempMos ?? previous.tempMos,
    tempCell1: data.tempSensor1 ?? previous.tempCell1,
    tempCell2: data.tempSensor2 ?? previous.tempCell2,

    // Capacity
    capacityAh,
    remainingAh: (percentage / 100) * capacityAh,
    cycleCount: data.cycleCount ?? previous.cycleCount,

    // Status
    isCharging:
      (data.isCharging ?? false) || current > CHARGE_CURRENT_THRESHOLD,
    isDischarging:
      (data.isDischarging ?? false) || current < -CHARGE_CURRENT_THRESHOLD,
    balancing:
      data.balanceState === undefined
        ? previous.balancing
        : data.balanceState !== 0,
    balanceCurrent: data.balanceCurrent ?? previous.balanceCurrent,

    // Alarms
    alarms,
    hasAlarm: alarms.length > 0,

    // Timestamp
    lastUpdate: Date.now(),
  };
}
