import type { Device } from "react-native-ble-plx";
import { describe, expect, it } from "vitest";
import type { DeviceHandle } from "@/domain/ports/DeviceHandle";
import {
  BleConnections,
  UnknownDeviceError,
} from "@/infrastructure/ble/BleConnections";
import { BleTransportFactory } from "@/infrastructure/ble/BleTransportFactory";

type Write = { uuid: string; payload: string };

class FakeDevice {
  readonly writes: Write[] = [];

  constructor(
    readonly id: string,
    readonly name: string | null,
  ) {}

  async writeCharacteristicWithResponseForService(
    _serviceUuid: string,
    characteristicUuid: string,
    payload: string,
  ) {
    this.writes.push({ uuid: characteristicUuid, payload });
    return this;
  }

  async writeCharacteristicWithoutResponseForService(
    _serviceUuid: string,
    characteristicUuid: string,
    payload: string,
  ) {
    this.writes.push({ uuid: characteristicUuid, payload });
    return this;
  }

  onDisconnected(_listener: () => void) {
    return { remove: () => {} };
  }
}

function connect(connections: BleConnections, device: FakeDevice) {
  return connections.add(device as unknown as Device);
}

const UNKNOWN_HANDLE: DeviceHandle = { id: "never-connected", name: "Ghost" };

describe("BleTransportFactory", () => {
  it("sends a module command to the device the handle stands for", async () => {
    const connections = new BleConnections();
    const water = new FakeDevice("water-id", "Water Module");
    const heater = new FakeDevice("heater-id", "Heater Module");
    connect(connections, water);
    const heaterHandle = connect(connections, heater);
    const factory = new BleTransportFactory(connections);

    await factory
      .moduleTransport(heaterHandle, "0002")
      .openChannel("0003")
      .send("START");

    expect(heater.writes).toHaveLength(1);
    expect(water.writes).toHaveLength(0);
  });

  it("sends raw bytes to the device the handle stands for", async () => {
    const connections = new BleConnections();
    const bms = new FakeDevice("bms-id", "JK BMS");
    const handle = connect(connections, bms);
    const factory = new BleTransportFactory(connections);

    await factory.binaryTransport(handle).send(new Uint8Array([0x4e, 0x57]));

    expect(bms.writes).toHaveLength(1);
  });

  it("refuses to build a module transport for a handle with no live connection", () => {
    const factory = new BleTransportFactory(new BleConnections());

    expect(() => factory.moduleTransport(UNKNOWN_HANDLE, "0002")).toThrow(
      UnknownDeviceError,
    );
  });

  it("refuses to build a binary transport for a handle with no live connection", () => {
    const factory = new BleTransportFactory(new BleConnections());

    expect(() => factory.binaryTransport(UNKNOWN_HANDLE)).toThrow(
      UnknownDeviceError,
    );
  });

  it("stops resolving a handle once the device is dropped", () => {
    const connections = new BleConnections();
    const water = new FakeDevice("water-id", "Water");
    const handle = connect(connections, water);
    const factory = new BleTransportFactory(connections);

    connections.remove(water as unknown as Device);

    expect(() => factory.moduleTransport(handle, "0001")).toThrow(
      UnknownDeviceError,
    );
  });
});
