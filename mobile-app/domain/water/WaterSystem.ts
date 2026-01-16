import { BlePlxChannel } from "@/core/bluetooth/Channel";
import { ChannelIdentifier } from "@/core/bluetooth/ChannelIdentifier";
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
  public static readonly serviceUuid: string = "aaf8707e-2734-4e30-94b8-8d2725a5ceca";
  private readonly channels: Record<WaterModuleChannel, ChannelIdentifier> = {
    admin: {
      serviceUuid: WaterSystem.serviceUuid,
      txUuid: "aaf8707e-2734-4e30-94b8-8d2725a5cedb",
      rxUuid: "aaf8707e-2734-4e30-94b8-8d2725a5cedc",
    },
    cleanTank: {
      serviceUuid: WaterSystem.serviceUuid,
      txUuid: "aaf8707e-2734-4e30-94b8-8d2725a5ced0",
      rxUuid: "aaf8707e-2734-4e30-94b8-8d2725a5ced1",
    },
    greyTank: {
      serviceUuid: WaterSystem.serviceUuid,
      txUuid: "aaf8707e-2734-4e30-94b8-8d2725a5ced2",
      rxUuid: "aaf8707e-2734-4e30-94b8-8d2725a5ced3",
    },
    greyValve: {
      serviceUuid: WaterSystem.serviceUuid,
      txUuid: "aaf8707e-2734-4e30-94b8-8d2725a5ced4",
      rxUuid: "aaf8707e-2734-4e30-94b8-8d2725a5ced5",
    },
  };

  constructor(bluetooth: Device) {
    this.admin = new AdminModule(new BlePlxChannel(bluetooth, this.channels.admin));
    this.cleanTank = new TankLevelSensor(new BlePlxChannel(bluetooth, this.channels.cleanTank));
    this.greyTank = new TankLevelSensor(new BlePlxChannel(bluetooth, this.channels.greyTank));
    this.greyDrainValve = new DrainValve(new BlePlxChannel(bluetooth, this.channels.greyValve));
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
