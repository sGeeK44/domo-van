import { decode as base64Decode, encode as base64Encode } from "base-64";
import { BleError, Characteristic, Device } from "react-native-ble-plx";
import { Listener, Unsubscribe } from "../observable";
import { ChannelIdentifier } from "./ChannelIdentifier";

export interface Channel {
  listen(listener: Listener<string>): Unsubscribe;
  send(command: string): Promise<void>;
  disconnect(): Promise<void>;
}

export class BlePlxChannel implements Channel {
  private listener: Listener<string> | null = null;

  constructor(private readonly device: Device, private readonly channel: ChannelIdentifier) {

  }

  public listen(listner: Listener<string>) : Unsubscribe {
    this.listener = listner;
    const sub = this.device.monitorCharacteristicForService(
        this.channel.serviceUuid,
        this.channel.txUuid,
        this.onMessage
      );
      return () => {
        this.listener = null;
        try {
          sub.remove();
        } catch {
          // Ignore errors when removing subscription - this can happen
          // due to a bug in react-native-ble-plx when canceling transactions
        }
      };
  }

  private onMessage = (error: BleError | null, characteristic: Characteristic | null) => {
    const value = characteristic?.value;
    if (!value) return;
    let decoded: string;
    try {
      decoded = base64Decode(value);
    } catch (e) {
      console.warn(e);
      return;
    }

    if (!this.listener) return;
    try {
      this.listener(decoded);
    } catch (e) {
      // never crash listeners
      console.warn(e);
    }
  };

  public async send(command: string) : Promise<void> {
          const payload = base64Encode(command);
          await this.device.writeCharacteristicWithResponseForService(
            this.channel.serviceUuid,
            this.channel.rxUuid,
            payload
          );
  }

  public async disconnect() : Promise<void> {
    await this.device.cancelConnection();
  }
}
