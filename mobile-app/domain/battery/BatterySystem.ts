import { Device } from "react-native-ble-plx";
import {
  JkBmsChannel,
  JK_BMS_SERVICE_UUID_SHORT,
} from "@/core/bluetooth/JkBmsChannel";
import { JkBmsData } from "@/core/bluetooth/JkBmsProtocol";
import {
  createObservable,
  Listener,
  Observable,
  Unsubscribe,
} from "@/core/observable";
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
  /**
   * Service UUID for scanning (short 16-bit format)
   */
  public static readonly serviceId: string = JK_BMS_SERVICE_UUID_SHORT;

  private readonly channel: JkBmsChannel;
  private readonly state: ReturnType<typeof createObservable<BatterySnapshot>>;
  private channelUnsub: Unsubscribe | null = null;

  constructor(bluetooth: Device) {
    this.channel = new JkBmsChannel(bluetooth);
    this.state = createObservable<BatterySnapshot>(DEFAULT_BATTERY_SNAPSHOT);

    // Start listening for BMS data
    this.channelUnsub = this.channel.listen(this.onBmsData);
  }

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
    await this.channel.sendReadCommand();
  }

  /**
   * Handle incoming BMS data and update state
   */
  private onBmsData = (data: JkBmsData): void => {
    const cellVoltages = data.cellVoltages.filter((v) => v > 0);
    const minCellVoltage =
      cellVoltages.length > 0 ? Math.min(...cellVoltages) : 0;
    const maxCellVoltage =
      cellVoltages.length > 0 ? Math.max(...cellVoltages) : 0;

    const alarms = parseAlarms(data.errors);

    const snapshot: BatterySnapshot = {
      // Main indicators
      percentage: data.soc,
      voltage: data.totalVoltage,
      current: data.current,
      power: data.totalVoltage * data.current,

      // Cell details
      cellVoltages,
      cellCount: data.cellCount || cellVoltages.length,
      minCellVoltage,
      maxCellVoltage,
      cellDelta: maxCellVoltage - minCellVoltage,

      // Temperatures
      tempMos: data.tempMos,
      tempCell1: data.tempSensor1,
      tempCell2: data.tempSensor2,

      // Capacity
      capacityAh: data.capacityAh,
      remainingAh: (data.soc / 100) * data.capacityAh,
      cycleCount: data.cycleCount,

      // Status
      isCharging: data.isCharging || data.current > 0.1,
      isDischarging: data.isDischarging || data.current < -0.1,
      balancing: data.balanceState !== 0,
      balanceCurrent: data.balanceCurrent,

      // Alarms
      alarms,
      hasAlarm: alarms.length > 0,

      // Timestamp
      lastUpdate: Date.now(),
    };

    this.state.setValue(snapshot);
  };

  /**
   * Clean up resources
   */
  dispose = (): void => {
    this.channelUnsub?.();
    this.channelUnsub = null;
    this.state.destroy();
  };
}
