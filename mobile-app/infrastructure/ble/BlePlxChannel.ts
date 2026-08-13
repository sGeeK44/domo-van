import { decode as base64Decode, encode as base64Encode } from "base-64";
import type { BleError, Characteristic, Device } from "react-native-ble-plx";
import { createFanout, type Source } from "@/core/fanout";
import type { Listener, Unsubscribe } from "@/core/observable";
import {
  buildRxUuid,
  buildServiceUuid,
  buildTxUuid,
} from "@/domain/modules/BleUuid";
import type { Channel } from "@/domain/ports/Channel";

const MESSAGE_SEPARATOR = "\n";

export class BlePlxChannel implements Channel {
  private readonly messages = createFanout<string>(() =>
    this.monitorCharacteristic(),
  );
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

  public listen(listener: Listener<string>): Unsubscribe {
    return this.messages.add(listener);
  }

  public async send(command: string): Promise<void> {
    const payload = base64Encode(command);
    await this.device.writeCharacteristicWithResponseForService(
      this.serviceUuid,
      this.rxUuid,
      payload,
    );
  }

  private monitorCharacteristic(): Source {
    this.buffer = "";
    return this.device.monitorCharacteristicForService(
      this.serviceUuid,
      this.txUuid,
      this.onMessage,
    );
  }

  private onMessage = (
    _error: BleError | null,
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

    this.buffer += decoded;
    for (const message of this.takeCompleteMessages()) {
      this.messages.emit(message);
    }
  };

  /** A notification carries an arbitrary slice of the stream, not a whole message. */
  private takeCompleteMessages(): string[] {
    const parts = this.buffer.split(MESSAGE_SEPARATOR);
    this.buffer = parts.pop() ?? "";
    return parts.filter((message) => message.length > 0);
  }
}
