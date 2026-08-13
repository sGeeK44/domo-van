import { decode as base64Decode, encode as base64Encode } from "base-64";
import type { BleError, Characteristic, Device } from "react-native-ble-plx";
import { createFanout, type Source } from "@/core/fanout";
import type { Listener, Unsubscribe } from "@/core/observable";
import {
  JK_BMS_CHARACTERISTIC_UUID,
  JK_BMS_SERVICE_UUID,
} from "@/domain/battery/JkBmsUuids";
import type { BinaryTransport } from "@/domain/ports/BinaryTransport";

/** Carries raw JK BMS bytes over its notify/write characteristic: base64 ↔ bytes, nothing else. */
export class JkBmsBinaryTransport implements BinaryTransport {
  private readonly notifications = createFanout<Uint8Array>(() =>
    this.monitorCharacteristic(),
  );

  constructor(private readonly device: Device) {}

  listen(onBytes: Listener<Uint8Array>): Unsubscribe {
    return this.notifications.add(onBytes);
  }

  async send(bytes: Uint8Array): Promise<void> {
    await this.device.writeCharacteristicWithoutResponseForService(
      JK_BMS_SERVICE_UUID,
      JK_BMS_CHARACTERISTIC_UUID,
      base64Encode(toBinaryString(bytes)),
    );
  }

  private monitorCharacteristic(): Source {
    return this.device.monitorCharacteristicForService(
      JK_BMS_SERVICE_UUID,
      JK_BMS_CHARACTERISTIC_UUID,
      this.onNotification,
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

    this.notifications.emit(toBytes(decoded));
  };
}

/** Per-byte, because spreading a large frame onto the argument stack overflows it. */
function toBinaryString(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return binary;
}

function toBytes(binary: string): Uint8Array {
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}
