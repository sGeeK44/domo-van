import { decode as base64Decode, encode as base64Encode } from "base-64";
import type { BleError, Characteristic, Device } from "react-native-ble-plx";
import type { Listener, Unsubscribe } from "@/core/observable";
import {
  JK_BMS_CHARACTERISTIC_UUID,
  JK_BMS_SERVICE_UUID,
} from "@/domain/battery/JkBmsUuids";
import type { BinaryTransport } from "@/domain/ports/BinaryTransport";

/**
 * Carries raw JK BMS bytes over its single notify/write characteristic.
 * Frame assembly and parsing are domain concerns and live in
 * `JkBmsFrameReader`; all this does is base64 ↔ bytes.
 */
export class JkBmsBinaryTransport implements BinaryTransport {
  private listener: Listener<Uint8Array> | null = null;
  private subscription: { remove: () => void } | null = null;

  constructor(private readonly device: Device) {}

  listen(onBytes: Listener<Uint8Array>): Unsubscribe {
    this.listener = onBytes;
    this.subscription = this.device.monitorCharacteristicForService(
      JK_BMS_SERVICE_UUID,
      JK_BMS_CHARACTERISTIC_UUID,
      this.onNotification,
    );

    return () => {
      this.listener = null;
      try {
        this.subscription?.remove();
      } catch {
        // Ignore errors when removing subscription
      }
      this.subscription = null;
    };
  }

  async send(bytes: Uint8Array): Promise<void> {
    const payload = base64Encode(String.fromCharCode(...bytes));
    await this.device.writeCharacteristicWithoutResponseForService(
      JK_BMS_SERVICE_UUID,
      JK_BMS_CHARACTERISTIC_UUID,
      payload,
    );
  }

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

    let decoded: string;
    try {
      decoded = base64Decode(value);
    } catch (e) {
      console.warn("Failed to decode notification:", e);
      return;
    }

    const bytes = new Uint8Array(decoded.length);
    for (let i = 0; i < decoded.length; i++) {
      bytes[i] = decoded.charCodeAt(i);
    }

    try {
      this.listener?.(bytes);
    } catch (e) {
      console.warn("Error in JK BMS listener:", e);
    }
  };
}
