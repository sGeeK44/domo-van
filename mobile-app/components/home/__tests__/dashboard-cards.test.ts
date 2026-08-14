import { describe, expect, it } from "vitest";
import {
  type DashboardCardView,
  type DashboardReadings,
  dashboardCards,
} from "@/components/home/dashboard-cards";
import { DEFAULT_BATTERY_SNAPSHOT } from "@/domain/battery/BatteryTelemetry";
import { DEFAULT_ZONE_SNAPSHOT } from "@/domain/heater/HeaterZone";
import { ALL_MODULES } from "@/domain/modules/ModuleDescriptor";
import type { LinkState, ModuleSlot } from "@/domain/modules/ModuleSlot";
import { DEFAULT_TANK_SNAPSHOT } from "@/domain/water/TankLevelSensor";

const ONLINE: LinkState = { status: "online", since: 0 };
const OFFLINE: LinkState = { status: "offline", lastContactAt: 0 };

const PAIRED = { id: "fake", name: "fake" } as const;

const READINGS: DashboardReadings = {
  battery: {
    ...DEFAULT_BATTERY_SNAPSHOT,
    percentage: 82,
    voltage: 13.42,
    current: -6.6,
    power: -88.4,
    capacityAh: 200,
  },
  cleanTank: {
    ...DEFAULT_TANK_SNAPSHOT,
    capacityLiters: 100,
    percentage: 72,
  },
  greyTank: { ...DEFAULT_TANK_SNAPSHOT, capacityLiters: 80, percentage: 41.25 },
  heater: {
    isRunning: true,
    referenceIndex: 0,
    reference: {
      ...DEFAULT_ZONE_SNAPSHOT,
      temperatureCelsius: 20.4,
      setpointCelsius: 21,
      isRunning: true,
    },
  },
};

function slots(state: {
  [key: string]: "online" | "offline" | "unpaired";
}): readonly ModuleSlot[] {
  return ALL_MODULES.map((module) => ({
    module,
    pairing: state[module.key] === "unpaired" ? null : { ...PAIRED },
    link: state[module.key] === "offline" ? OFFLINE : ONLINE,
  }));
}

const ALL_ONLINE = slots({
  battery: "online",
  water: "online",
  heater: "online",
});

function cards(
  of: readonly ModuleSlot[] = ALL_ONLINE,
  readings = READINGS,
): readonly DashboardCardView[] {
  return dashboardCards(of, readings);
}

function card(id: string, from = cards()): DashboardCardView {
  const found = from.find((view) => view.id === id);
  if (!found) throw new Error(`no "${id}" card`);
  return found;
}

function reading(id: string, from = cards()) {
  const found = card(id, from);
  if (found.state !== "reading") throw new Error(`"${id}" reads nothing`);
  return found;
}

describe("the cards the dashboard draws", () => {
  // The ticket's own example: one module, two cards, and card count is not module count.
  it("gives an online module one card per card it declares", () => {
    expect(cards().map((view) => view.id)).toEqual([
      "battery",
      "cleanWater",
      "greyWater",
      "heater",
    ]);
  });

  it("folds an offline module back into a single card, in its own place", () => {
    const offline = cards(
      slots({ battery: "online", water: "offline", heater: "online" }),
    );

    expect(offline.map((view) => view.id)).toEqual([
      "battery",
      "water",
      "heater",
    ]);
    expect(card("water", offline)).toMatchObject({
      state: "offline",
      link: OFFLINE,
      labelKey: "dashboard.modules.water",
    });
  });

  it("offers one card per free slot when nothing is paired", () => {
    const empty = cards(
      slots({ battery: "unpaired", water: "unpaired", heater: "unpaired" }),
    );

    expect(empty).toHaveLength(3);
    expect(empty.every((view) => view.state === "unpaired")).toBe(true);
  });

  it("paints each card with the palette entry its key names", () => {
    expect(cards().map((view) => view.tint)).toEqual([
      "battery",
      "cleanWater",
      "greyWater",
      "heat",
    ]);
  });

  it("reads the battery as a level, a runtime, a voltage and a power", () => {
    expect(reading("battery")).toMatchObject({
      ratio: 0.82,
      value: { amount: "82", unit: "%" },
      subtitle: {
        key: "dashboard.battery.summary",
        params: { duration: "24h 51m", voltage: "13.4", power: -88 },
      },
    });
  });

  it("turns a tank percentage into the litres it holds", () => {
    expect(reading("cleanWater")).toMatchObject({
      value: { amount: "72", unit: "L" },
      subtitle: {
        key: "dashboard.water.cleanSubtitle",
        params: { liters: 72, capacity: 100 },
      },
    });
  });

  it("counts the grey tank down to full, not up from empty", () => {
    expect(reading("greyWater")).toMatchObject({
      value: { amount: "33", unit: "L" },
      subtitle: {
        key: "dashboard.water.greySubtitle",
        params: { liters: 47 },
      },
    });
  });

  it("quotes the reference zone's target, named by its own key", () => {
    // 20.4 °C on the bar's own 10–30 °C span.
    expect(reading("heater").ratio).toBeCloseTo(0.52);
    expect(reading("heater")).toMatchObject({
      value: { amount: "20.4", unit: "°" },
      subtitle: {
        key: "dashboard.heater.zoneTarget",
        params: { temperature: "21.0" },
        keyParams: { zone: "heater.zones.zone1" },
      },
    });
  });

  it("empties the heater card while every zone is off", () => {
    const stopped = cards(ALL_ONLINE, {
      ...READINGS,
      heater: { ...READINGS.heater, isRunning: false },
    });

    expect(reading("heater", stopped)).toMatchObject({
      ratio: 0,
      subtitle: { key: "dashboard.heater.allStopped" },
    });
  });
});
