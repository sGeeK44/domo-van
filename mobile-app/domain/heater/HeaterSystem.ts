import { Device } from "react-native-ble-plx";
import { BlePlxChannel } from "@/core/bluetooth/Channel";
import { AdminModule } from "@/domain/AdminModule";
import { HeaterZone } from "@/domain/heater/HeaterZone";

export type HeaterModuleChannel =
  | "admin"
  | "heater_0"
  | "heater_1"
  | "heater_2"
  | "heater_3";

export class HeaterSystem {
  readonly admin: AdminModule;
  readonly zones: readonly [HeaterZone, HeaterZone, HeaterZone, HeaterZone];

  public static readonly serviceId: string = "0002";

  private readonly channels: Record<HeaterModuleChannel, string> = {
    admin: "0001",
    heater_0: "0002",
    heater_1: "0003",
    heater_2: "0004",
    heater_3: "0005",
  };

  constructor(bluetooth: Device) {
    this.admin = new AdminModule(
      new BlePlxChannel(bluetooth, HeaterSystem.serviceId, this.channels.admin),
    );

    this.zones = [
      new HeaterZone(
        new BlePlxChannel(
          bluetooth,
          HeaterSystem.serviceId,
          this.channels.heater_0,
        ),
        0,
      ),
      new HeaterZone(
        new BlePlxChannel(
          bluetooth,
          HeaterSystem.serviceId,
          this.channels.heater_1,
        ),
        1,
      ),
      new HeaterZone(
        new BlePlxChannel(
          bluetooth,
          HeaterSystem.serviceId,
          this.channels.heater_2,
        ),
        2,
      ),
      new HeaterZone(
        new BlePlxChannel(
          bluetooth,
          HeaterSystem.serviceId,
          this.channels.heater_3,
        ),
        3,
      ),
    ] as const;
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
  };
}
