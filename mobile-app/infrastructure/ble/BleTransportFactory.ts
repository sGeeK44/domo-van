import type { BinaryTransport } from "@/domain/ports/BinaryTransport";
import type { DeviceHandle } from "@/domain/ports/DeviceHandle";
import type { ModuleTransport } from "@/domain/ports/ModuleTransport";
import type { TransportFactory } from "@/domain/ports/TransportFactory";
import type { BleConnections } from "@/infrastructure/ble/BleConnections";
import { BlePlxChannel } from "@/infrastructure/ble/BlePlxChannel";
import { JkBmsBinaryTransport } from "@/infrastructure/ble/JkBmsBinaryTransport";

/**
 * Builds the transports a module system needs from a connected device.
 * Keeping `serviceId` here rather than on `ModuleTransport` is what stops a
 * system reaching another module's service.
 */
export class BleTransportFactory implements TransportFactory {
  constructor(private readonly connections: BleConnections) {}

  moduleTransport(device: DeviceHandle, serviceId: string): ModuleTransport {
    const connected = this.connections.require(device);
    return {
      openChannel: (channelId) =>
        new BlePlxChannel(connected, serviceId, channelId),
    };
  }

  binaryTransport(device: DeviceHandle): BinaryTransport {
    return new JkBmsBinaryTransport(this.connections.require(device));
  }
}
