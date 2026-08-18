import {
  createObservable,
  Listener,
  Observable,
  Unsubscribe,
} from "@/core/observable";
import { JkBmsFrameReader } from "@/domain/battery/JkBmsFrameReader";
import {
  buildCellInfoCommand,
  buildDeviceInfoCommand,
  JkBmsCellInfo,
} from "@/domain/battery/JkBmsProtocol";
import type { BinaryTransport } from "@/domain/ports/BinaryTransport";
import {
  BatterySnapshot,
  DEFAULT_BATTERY_SNAPSHOT,
  isLiveCell,
  parseAlarms,
} from "./BatteryTelemetry";

/** The pause the BMS needs after the wake-up before it accepts the cell-info request. */
const STREAM_WAKE_DELAY_MS = 500;

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
      this.onCellInfo(frame);
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
   * Start the BMS telemetry stream; it then broadcasts on its own at 1 Hz.
   */
  async refresh(): Promise<void> {
    // The device-info request wakes the stream: sent alone, the cell-info
    // request goes unanswered (verified against the physical BMS).
    await this.transport.send(buildDeviceInfoCommand());
    await delay(STREAM_WAKE_DELAY_MS);
    await this.transport.send(buildCellInfoCommand());
  }

  /** A reconnect starts from a clean parser: the dropped session may have left half a frame. */
  resync = (): void => {
    this.frameReader.reset();
    void this.refresh().catch((err) => {
      console.warn("Failed to send read command on resync:", err);
    });
  };

  /**
   * Handle incoming BMS data and update state
   */
  private onCellInfo = (data: JkBmsCellInfo): void => {
    this.state.setValue(toSnapshot(data));
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

/** Below this, the trickle through a closed MOSFET does not count as activity. */
const CHARGE_CURRENT_THRESHOLD = 0.1;

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Derives the whole snapshot from one frame: a JK02 frame carries every field. */
function toSnapshot(data: JkBmsCellInfo): BatterySnapshot {
  const liveCells = data.cellVoltages.filter(isLiveCell);
  const minCellVoltage = liveCells.length > 0 ? Math.min(...liveCells) : 0;
  const maxCellVoltage = liveCells.length > 0 ? Math.max(...liveCells) : 0;
  const alarms = parseAlarms(data.alarms);

  return {
    // Main indicators
    percentage: data.soc,
    voltage: data.voltage,
    current: data.current,
    // The BMS reports power as a magnitude; the current carries the direction.
    power: data.current < 0 ? -data.power : data.power,

    // Cell details
    cellVoltages: data.cellVoltages,
    cellCount: data.cellVoltages.length,
    minCellVoltage,
    maxCellVoltage,
    cellDelta: maxCellVoltage - minCellVoltage,

    // Temperatures
    tempMos: data.tempMos,
    tempCell1: data.tempSensor1,
    tempCell2: data.tempSensor2,

    // Capacity
    capacityAh: data.nominalAh,
    remainingAh: data.remainingAh,
    cycleCount: data.cycleCount,

    // Status
    isCharging: data.chargeMosfetOn && data.current > CHARGE_CURRENT_THRESHOLD,
    isDischarging:
      data.dischargeMosfetOn && data.current < -CHARGE_CURRENT_THRESHOLD,
    balancing: data.balancing,
    balanceCurrent: data.balanceCurrent,

    // Alarms
    alarms,
    hasAlarm: alarms.length > 0,

    // Timestamp
    lastUpdate: Date.now(),
  };
}
