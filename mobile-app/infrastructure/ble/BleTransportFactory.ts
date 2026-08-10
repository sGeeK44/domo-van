import type { Device } from "react-native-ble-plx";
import type { BinaryTransport } from "@/domain/ports/BinaryTransport";
import type { ModuleTransport } from "@/domain/ports/ModuleTransport";
import { BlePlxChannel } from "@/infrastructure/ble/BlePlxChannel";
import { JkBmsBinaryTransport } from "@/infrastructure/ble/JkBmsBinaryTransport";

/**
 * Builds the transports a module system needs from a connected device.
 * Keeping `serviceId` here rather than on `ModuleTransport` is what stops a
 * system reaching another module's service.
 */
export class BleTransportFactory {
  moduleTransport(device: Device, serviceId: string): ModuleTransport {
    return {
      openChannel: (channelId) =>
        new BlePlxChannel(device, serviceId, channelId),
    };
  }

  binaryTransport(device: Device): BinaryTransport {
    return new JkBmsBinaryTransport(device);
  }
}
