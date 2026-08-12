import type { BinaryTransport } from "@/domain/ports/BinaryTransport";
import type { DeviceHandle } from "@/domain/ports/DeviceHandle";
import type { ModuleTransport } from "@/domain/ports/ModuleTransport";

/** Turns a connected device into the transport a module system speaks. */
export interface TransportFactory {
  moduleTransport(device: DeviceHandle, serviceId: string): ModuleTransport;
  binaryTransport(device: DeviceHandle): BinaryTransport;
}
