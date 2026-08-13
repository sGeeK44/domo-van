import type { ModuleTransport } from "@/domain/ports/ModuleTransport";
import { DrainValve } from "@/domain/water/DrainValve";
import { TankLevelSensor } from "@/domain/water/TankLevelSensor";
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

export class WaterSystem {
  readonly admin: AdminModule;
  readonly cleanTank: TankLevelSensor;
  readonly greyTank: TankLevelSensor;
  readonly greyDrainValve: DrainValve;

  constructor(transport: ModuleTransport) {
    this.admin = new AdminModule(transport.openChannel(CHANNELS.admin));
    this.cleanTank = new TankLevelSensor(
      transport.openChannel(CHANNELS.cleanTank),
    );
    this.greyTank = new TankLevelSensor(
      transport.openChannel(CHANNELS.greyTank),
    );
    this.greyDrainValve = new DrainValve(
      transport.openChannel(CHANNELS.greyValve),
    );
  }

  /** Re-issues the probes each leaf sent from its constructor, once a link is back. */
  resync = () => {
    void this.cleanTank.getConfig().catch(() => {});
    void this.greyTank.getConfig().catch(() => {});
    void this.greyDrainValve.getConfig().catch(() => {});
  };

  dispose = () => {
    this.admin.dispose();
    this.cleanTank.dispose();
    this.greyTank.dispose();
    this.greyDrainValve.dispose();
  };
}
