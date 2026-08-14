import { createObservable, type Observable } from "@/core/observable";
import { AdminModule } from "@/domain/AdminModule";
import { EnvironmentData } from "@/domain/heater/EnvironmentData";
import {
  nightTargetCelsius,
  snapSetpoint,
} from "@/domain/heater/HeaterPresets";
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

  private readonly nightModeState = createObservable(false);
  /** Night mode is a preset, not a toggle: every other write leaves it. */
  readonly nightMode: Observable<boolean> = this.nightModeState;

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

  /** Adjusting a target starts the zone it belongs to, and leaves night mode. */
  adjustZone = async (index: number, deltaCelsius: number): Promise<void> => {
    const zone = this.getZone(index);
    const target = snapSetpoint(zone.getValue().setpointCelsius + deltaCelsius);

    this.nightModeState.setValue(false);
    await zone.setSetpoint(target);
    if (!zone.getValue().isRunning) {
      await zone.start();
    }
  };

  toggleZone = async (index: number): Promise<void> => {
    const zone = this.getZone(index);

    this.nightModeState.setValue(false);
    await (zone.getValue().isRunning ? zone.stop() : zone.start());
  };

  /** Leaving night mode rewrites nothing: the day targets live in the module. */
  applyNightMode = async (): Promise<void> => {
    for (const zone of this.zones) {
      const target = nightTargetCelsius(zone.zoneIndex);
      if (target === null) {
        await zone.stop();
        continue;
      }
      await zone.setSetpoint(target);
      await zone.start();
    }
    this.nightModeState.setValue(true);
  };

  stopAll = async (): Promise<void> => {
    this.nightModeState.setValue(false);
    for (const zone of this.zones) {
      await zone.stop();
    }
  };

  resync = () => {
    for (const zone of this.zones) {
      void zone.getStatus().catch(() => {});
      void zone.getPidConfig().catch(() => {});
    }
    void this.environment.getEnvironment().catch(() => {});
  };

  dispose = () => {
    this.admin.dispose();
    for (const zone of this.zones) {
      zone.dispose();
    }
    this.environment.dispose();
    this.nightModeState.destroy();
  };
}
