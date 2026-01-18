import { BlePlxChannel } from "@/core/bluetooth/Channel";
import { DrainValve } from "@/domain/water/DrainValve";
import { TankLevelSensor } from "@/domain/water/TankLevelSensor";
import { Device } from "react-native-ble-plx";
import { AdminModule } from "../AdminModule";

export type WaterModuleChannel = "admin" | "cleanTank" | "greyTank" | "greyValve";

export class WaterSystem {
  readonly admin: AdminModule;
  readonly cleanTank: TankLevelSensor;
  readonly greyTank: TankLevelSensor;
  readonly greyDrainValve: DrainValve;
  public static readonly serviceId: string = "0001";
  private readonly channels: Record<WaterModuleChannel, string> = {
    admin: "0001",
    cleanTank: "0002",
    greyTank: "0003",
    greyValve: "0004",
  };

  constructor(bluetooth: Device) {
    this.admin = new AdminModule(new BlePlxChannel(bluetooth, WaterSystem.serviceId, this.channels.admin));
    this.cleanTank = new TankLevelSensor(new BlePlxChannel(bluetooth, WaterSystem.serviceId, this.channels.cleanTank));
    this.greyTank = new TankLevelSensor(new BlePlxChannel(bluetooth, WaterSystem.serviceId, this.channels.greyTank));
    this.greyDrainValve = new DrainValve(new BlePlxChannel(bluetooth, WaterSystem.serviceId, this.channels.greyValve));
  }

  getTankSettings(name: string) {
    switch (name) {
      case "clean":
        return this.cleanTank;
      case "grey":
        return this.greyTank;
      default:
        throw new Error(`Unknown tank: ${name}`);
    }
  }

  dispose = () => {
    this.admin.dispose();
    this.cleanTank.dispose();
    this.greyTank.dispose();
    this.greyDrainValve.dispose();
  };
}
