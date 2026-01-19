import { decode as base64Decode, encode as base64Encode } from "base-64";
import { BleError, Characteristic, Device } from "react-native-ble-plx";
import { Listener, Unsubscribe } from "../observable";
import { buildRxUuid, buildServiceUuid, buildTxUuid } from "./BleUuid";

export interface Channel {
  listen(listener: Listener<string>): Unsubscribe;
  send(command: string): Promise<void>;
  disconnect(): Promise<void>;
}

export class BlePlxChannel implements Channel {
  private listener: Listener<string> | null = null;
  private readonly serviceUuid: string;
  private readonly txUuid: string;
  private readonly rxUuid: string;
  private buffer = "";

  constructor(
    private readonly device: Device,
    serviceId: string,
    channelId: string,
  ) {
    this.serviceUuid = buildServiceUuid(serviceId);
    this.txUuid = buildTxUuid(serviceId, channelId);
    this.rxUuid = buildRxUuid(serviceId, channelId);
  }

  public listen(listner: Listener<string>): Unsubscribe {
    this.listener = listner;
    this.buffer = "";
    const sub = this.device.monitorCharacteristicForService(
      this.serviceUuid,
      this.txUuid,
      this.onMessage,
    );
    return () => {
      this.listener = null;
      this.buffer = "";
      try {
        sub.remove();
      } catch {
        // Ignore errors when removing subscription - this can happen
        // due to a bug in react-native-ble-plx when canceling transactions
      }
    };
  }

  private onMessage = (
    error: BleError | null,
    characteristic: Characteristic | null,
  ) => {
    const value = characteristic?.value;
    if (!value) return;
    let decoded: string;
    try {
      decoded = base64Decode(value);
    } catch (e) {
      console.warn(e);
      return;
    }

    // Buffer chunks until we receive complete message (ending with \n)
    this.buffer += decoded;

    // Process all complete messages in the buffer
    while (this.buffer.includes("\n")) {
      const idx = this.buffer.indexOf("\n");
      const message = this.buffer.substring(0, idx);
      this.buffer = this.buffer.substring(idx + 1);

      if (!this.listener || !message) continue;
      try {
        this.listener(message);
      } catch (e) {
        // never crash listeners
        console.warn(e);
      }
    }
  };

  public async send(command: string): Promise<void> {
    const payload = base64Encode(command);
    await this.device.writeCharacteristicWithResponseForService(
      this.serviceUuid,
      this.rxUuid,
      payload,
    );
  }

  public async disconnect(): Promise<void> {
    await this.device.cancelConnection();
  }
}
