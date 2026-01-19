import { decode as base64Decode, encode as base64Encode } from "base-64";
import { BleError, Characteristic, Device } from "react-native-ble-plx";
import { Listener, Unsubscribe } from "../observable";
import {
  buildReadAllCommand,
  findFrameStart,
  hasCompleteFrame,
  JkBmsData,
  parseResponse,
} from "./JkBmsProtocol";

/**
 * JK BMS BLE Service and Characteristic UUIDs
 * Uses standard Nordic UART-like service
 */
export const JK_BMS_SERVICE_UUID = "0000ffe0-0000-1000-8000-00805f9b34fb";
export const JK_BMS_CHARACTERISTIC_UUID = "0000ffe1-0000-1000-8000-00805f9b34fb";

/**
 * Short service UUID for scanning (16-bit)
 */
export const JK_BMS_SERVICE_UUID_SHORT = "FFE0";

/**
 * Channel for communicating with JK BMS via BLE notifications
 *
 * The JK BMS sends data via notifications on characteristic 0xFFE1.
 * After subscribing, we send a "Read All Data" command to trigger
 * the BMS to start streaming telemetry data.
 */
export class JkBmsChannel {
  private listener: Listener<JkBmsData> | null = null;
  private buffer: number[] = [];
  private subscription: { remove: () => void } | null = null;

  constructor(private readonly device: Device) {}

  /**
   * Start listening for BMS data notifications
   * Sends the initial "Read All Data" command to trigger streaming
   */
  public listen(listener: Listener<JkBmsData>): Unsubscribe {
    this.listener = listener;
    this.buffer = [];

    // Subscribe to notifications
    this.subscription = this.device.monitorCharacteristicForService(
      JK_BMS_SERVICE_UUID,
      JK_BMS_CHARACTERISTIC_UUID,
      this.onNotification,
    );

    // Send initial command to trigger data streaming
    this.sendReadCommand().catch((err) => {
      console.warn("Failed to send initial read command:", err);
    });

    return () => {
      this.listener = null;
      this.buffer = [];
      try {
        this.subscription?.remove();
        this.subscription = null;
      } catch {
        // Ignore errors when removing subscription
      }
    };
  }

  /**
   * Send "Read All Data" command to request telemetry
   */
  public async sendReadCommand(): Promise<void> {
    const command = buildReadAllCommand();
    const payload = base64Encode(String.fromCharCode(...command));

    await this.device.writeCharacteristicWithoutResponseForService(
      JK_BMS_SERVICE_UUID,
      JK_BMS_CHARACTERISTIC_UUID,
      payload,
    );
  }

  /**
   * Handle incoming BLE notification
   */
  private onNotification = (
    error: BleError | null,
    characteristic: Characteristic | null,
  ) => {
    if (error) {
      console.warn("JK BMS notification error:", error);
      return;
    }

    const value = characteristic?.value;
    if (!value) return;

    // Decode base64 to bytes
    let decoded: string;
    try {
      decoded = base64Decode(value);
    } catch (e) {
      console.warn("Failed to decode notification:", e);
      return;
    }

    // Convert string to byte array and append to buffer
    for (let i = 0; i < decoded.length; i++) {
      this.buffer.push(decoded.charCodeAt(i));
    }

    // Try to find and parse complete frames
    this.processBuffer();
  };

  /**
   * Process the buffer to extract complete frames
   */
  private processBuffer(): void {
    // Find frame start if buffer doesn't start with valid header
    const frameStart = findFrameStart(new Uint8Array(this.buffer));
    if (frameStart === -1) {
      // No valid frame start found, clear buffer
      this.buffer = [];
      return;
    }

    // Remove bytes before frame start
    if (frameStart > 0) {
      this.buffer = this.buffer.slice(frameStart);
    }

    // Check if we have a complete frame
    const bufferArray = new Uint8Array(this.buffer);
    if (!hasCompleteFrame(bufferArray)) {
      // Wait for more data
      return;
    }

    // Get frame length
    const length = (this.buffer[2] << 8) | this.buffer[3];
    const frameLength = length + 2; // +2 for start bytes

    // Extract the frame
    const frameData = new Uint8Array(this.buffer.slice(0, frameLength));

    // Remove processed frame from buffer
    this.buffer = this.buffer.slice(frameLength);

    // Parse the frame
    const parsed = parseResponse(frameData);
    if (parsed && this.listener) {
      try {
        this.listener(parsed);
      } catch (e) {
        console.warn("Error in JK BMS listener:", e);
      }
    }

    // Process remaining buffer (may contain another frame)
    if (this.buffer.length > 0) {
      this.processBuffer();
    }
  }

  /**
   * Disconnect from the BMS
   */
  public async disconnect(): Promise<void> {
    this.subscription?.remove();
    this.subscription = null;
    await this.device.cancelConnection();
  }
}
