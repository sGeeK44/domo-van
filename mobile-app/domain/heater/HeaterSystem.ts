import { AdminModule } from "@/domain/AdminModule";
import { EnvironmentData } from "@/domain/heater/EnvironmentData";
import { HeaterZone } from "@/domain/heater/HeaterZone";
import type { ModuleTransport } from "@/domain/ports/ModuleTransport";

export type HeaterModuleChannel =
  | "admin"
  | "heater_0"
  | "heater_1"
  | "heater_2"
  | "heater_3"
  | "environment";

const CHANNELS: Record<HeaterModuleChannel, string> = {
  admin: "0001",
  heater_0: "0002",
  heater_1: "0003",
  heater_2: "0004",
  heater_3: "0005",
  environment: "0006",
};

export class HeaterSystem {
  readonly admin: AdminModule;
  readonly zones: readonly [HeaterZone, HeaterZone, HeaterZone, HeaterZone];
  readonly environment: EnvironmentData;

  constructor(transport: ModuleTransport) {
    this.admin = new AdminModule(transport.openChannel(CHANNELS.admin));

    this.zones = [
      new HeaterZone(transport.openChannel(CHANNELS.heater_0), 0),
      new HeaterZone(transport.openChannel(CHANNELS.heater_1), 1),
      new HeaterZone(transport.openChannel(CHANNELS.heater_2), 2),
      new HeaterZone(transport.openChannel(CHANNELS.heater_3), 3),
    ] as const;

    this.environment = new EnvironmentData(
      transport.openChannel(CHANNELS.environment),
    );
  }

  getZone(index: number): HeaterZone {
    if (index < 0 || index > 3) {
      throw new Error(`Invalid zone index: ${index}. Must be 0-3.`);
    }
    return this.zones[index];
  }

  dispose = () => {
    this.admin.dispose();
    for (const zone of this.zones) {
      zone.dispose();
    }
    this.environment.dispose();
  };
}
