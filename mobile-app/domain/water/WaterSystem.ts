import { sinceBoot } from "@/core/clock";
import type { ModuleTransport } from "@/domain/ports/ModuleTransport";
import { type SaveOutcome, saveFields } from "@/domain/SaveOutcome";
import { DrainValve } from "@/domain/water/DrainValve";
import { TankLevelSensor } from "@/domain/water/TankLevelSensor";
import type { TankConfig } from "@/domain/water/WaterProtocol";
import { AdminModule } from "../AdminModule";

export type WaterModuleChannel =
  | "admin"
  | "cleanTank"
  | "greyTank"
  | "greyValve";

const CHANNELS: Record<WaterModuleChannel, string> = {
  admin: "0001",
  cleanTank: "0002",
  greyTank: "0003",
  greyValve: "0004",
};

/** The Eau — cuves et vanne form, whole: two tanks and the valve, three channels. */
export type TankAndValveConfig = {
  cleanTank: TankConfig;
  greyTank: TankConfig;
  autoCloseSeconds: number;
};

export class WaterSystem {
  readonly admin: AdminModule;
  readonly cleanTank: TankLevelSensor;
  readonly greyTank: TankLevelSensor;
  readonly greyDrainValve: DrainValve;

  constructor(transport: ModuleTransport, now: () => number = sinceBoot) {
    this.admin = new AdminModule(
      transport.openChannel(CHANNELS.admin),
      "water",
      now,
    );
    this.cleanTank = new TankLevelSensor(
      transport.openChannel(CHANNELS.cleanTank),
      now,
    );
    this.greyTank = new TankLevelSensor(
      transport.openChannel(CHANNELS.greyTank),
      now,
    );
    this.greyDrainValve = new DrainValve(
      transport.openChannel(CHANNELS.greyValve),
      now,
    );
  }

  saveTankAndValveConfig = (config: TankAndValveConfig): Promise<SaveOutcome> =>
    saveFields([
      {
        field: "water.cleanTank",
        write: () => this.cleanTank.saveConfig(config.cleanTank),
      },
      {
        field: "water.greyTank",
        write: () => this.greyTank.saveConfig(config.greyTank),
      },
      {
        field: "water.valve",
        write: () =>
          this.greyDrainValve.setAutoCloseTime(config.autoCloseSeconds),
      },
    ]);

  resync = () => {
    this.admin.resync();
    void this.cleanTank.resync().catch(() => {});
    void this.greyTank.resync().catch(() => {});
    void this.greyDrainValve.resync().catch(() => {});
  };

  dispose = () => {
    this.admin.dispose();
    this.cleanTank.dispose();
    this.greyTank.dispose();
    this.greyDrainValve.dispose();
  };
}
