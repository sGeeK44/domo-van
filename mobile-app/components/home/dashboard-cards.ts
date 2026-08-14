import type { Palette } from "@/design-system";
import {
  type BatterySnapshot,
  calculateRemainingTime,
  formatRemainingTime,
} from "@/domain/battery/BatteryTelemetry";
import type { HeaterZoneSnapshot } from "@/domain/heater/HeaterZone";
import type { DashboardCardKey } from "@/domain/modules/DashboardCardDescriptor";
import type {
  ModuleDescriptor,
  ModuleKey,
} from "@/domain/modules/ModuleDescriptor";
import type { LinkState, ModuleSlot } from "@/domain/modules/ModuleSlot";
import {
  clamp01,
  type TankLevelSnapshot,
} from "@/domain/water/TankLevelSensor";
import type { TranslationKey } from "@/i18n/keys";

/** The palette entry a card paints itself with. The catalogue names the card; this names the colour. */
export type DashboardCardTint = keyof Palette["fill"];

/** A key and what to fill it with: the view function returns copy nobody has read yet. */
export type CardCopy = {
  key: TranslationKey;
  params?: Readonly<Record<string, string | number>>;
  /** Params that are themselves keys, translated by the screen before the sentence is filled. */
  keyParams?: Readonly<Record<string, TranslationKey>>;
};

/** What the heater card quotes: one reference zone, and whether the module heats at all. */
export type HeaterReading = {
  isRunning: boolean;
  referenceIndex: number;
  reference: HeaterZoneSnapshot;
};

export type DashboardReadings = {
  battery: BatterySnapshot;
  cleanTank: TankLevelSnapshot;
  greyTank: TankLevelSnapshot;
  heater: HeaterReading;
};

type CardFace = {
  /** Stable across states, so a card keeps its place and its test hook when its module drops. */
  id: string;
  moduleKey: ModuleKey;
  icon: string;
  labelKey: TranslationKey;
  tint: DashboardCardTint;
};

type CardReading = {
  ratio: number;
  value: { amount: string; unit: string };
  subtitle: CardCopy;
};

export type DashboardCardView =
  | (CardFace & { state: "reading" } & CardReading)
  | (CardFace & { state: "unpaired" })
  | (CardFace & { state: "offline"; link: LinkState });

const PERCENT = "%";
const LITERS = "L";
const DEGREE = "°";

/** The zone bar spans 10–30 °C, the mockup's `(t − 10) × 5` %. */
const ZONE_FLOOR_CELSIUS = 10;
const ZONE_SPAN_CELSIUS = 20;

const CARD_TINT: Record<DashboardCardKey, DashboardCardTint> = {
  battery: "battery",
  cleanWater: "cleanWater",
  greyWater: "greyWater",
  heater: "heat",
};

/** An unpaired or offline module yields one card, so it needs a label of its own. */
const MODULE_LABEL_KEY: Record<ModuleKey, TranslationKey> = {
  battery: "dashboard.modules.battery",
  water: "dashboard.modules.water",
  heater: "dashboard.modules.heater",
};

/** Salon first: index 0 is the zone the dashboard quotes (planning decision 5). */
const ZONE_NAME_KEYS = [
  "heater.zones.zone1",
  "heater.zones.zone2",
  "heater.zones.zone3",
  "heater.zones.zone4",
] as const satisfies readonly TranslationKey[];

const CARD_READING: Record<
  DashboardCardKey,
  (readings: DashboardReadings) => CardReading
> = {
  battery: batteryReading,
  cleanWater: cleanWaterReading,
  greyWater: greyWaterReading,
  heater: heaterCardReading,
};

/**
 * One card per card an online module declares, one per module while it is
 * unpaired or offline (planning decision 1).
 */
export function dashboardCards(
  slots: readonly ModuleSlot[],
  readings: DashboardReadings,
): readonly DashboardCardView[] {
  return slots.flatMap((slot) => cardsOf(slot, readings));
}

function cardsOf(
  slot: ModuleSlot,
  readings: DashboardReadings,
): readonly DashboardCardView[] {
  if (!slot.pairing) {
    return [{ ...moduleFace(slot.module), state: "unpaired" }];
  }
  if (slot.link.status !== "online") {
    return [{ ...moduleFace(slot.module), state: "offline", link: slot.link }];
  }
  return slot.module.cards.map((card) => ({
    id: card.key,
    moduleKey: slot.module.key,
    icon: card.icon,
    labelKey: card.labelKey,
    tint: CARD_TINT[card.key],
    state: "reading",
    ...CARD_READING[card.key](readings),
  }));
}

function moduleFace(module: ModuleDescriptor): CardFace {
  return {
    id: module.key,
    moduleKey: module.key,
    icon: module.tabIcon,
    labelKey: MODULE_LABEL_KEY[module.key],
    tint: CARD_TINT[module.cards[0].key],
  };
}

function batteryReading({ battery }: DashboardReadings): CardReading {
  const hours = calculateRemainingTime(
    battery.percentage,
    battery.capacityAh,
    battery.current,
  );

  return {
    ratio: battery.percentage / 100,
    value: { amount: String(Math.round(battery.percentage)), unit: PERCENT },
    subtitle: {
      key: "dashboard.battery.summary",
      params: {
        duration: formatRemainingTime(hours),
        voltage: battery.voltage.toFixed(1),
        power: Math.round(battery.power),
      },
    },
  };
}

function cleanWaterReading({ cleanTank }: DashboardReadings): CardReading {
  return {
    ratio: cleanTank.percentage / 100,
    value: { amount: String(tankLiters(cleanTank)), unit: LITERS },
    subtitle: {
      key: "dashboard.water.cleanSubtitle",
      params: {
        liters: tankLiters(cleanTank),
        capacity: Math.round(cleanTank.capacityLiters),
      },
    },
  };
}

function greyWaterReading({ greyTank }: DashboardReadings): CardReading {
  const liters = tankLiters(greyTank);

  return {
    ratio: greyTank.percentage / 100,
    value: { amount: String(liters), unit: LITERS },
    subtitle: {
      key: "dashboard.water.greySubtitle",
      params: { liters: Math.round(greyTank.capacityLiters) - liters },
    },
  };
}

function heaterCardReading({ heater }: DashboardReadings): CardReading {
  const zone = heater.reference;

  return {
    // A module with every zone off shows no level at all, not the room's own temperature.
    ratio: heater.isRunning ? zoneRatio(zone.temperatureCelsius) : 0,
    value: { amount: zone.temperatureCelsius.toFixed(1), unit: DEGREE },
    subtitle: heater.isRunning
      ? {
          key: "dashboard.heater.zoneTarget",
          params: { temperature: zone.setpointCelsius.toFixed(1) },
          keyParams: { zone: zoneNameKey(heater.referenceIndex) },
        }
      : { key: "dashboard.heater.allStopped" },
  };
}

function tankLiters(tank: TankLevelSnapshot): number {
  return Math.round((tank.percentage / 100) * tank.capacityLiters);
}

export function zoneRatio(celsius: number): number {
  return clamp01((celsius - ZONE_FLOOR_CELSIUS) / ZONE_SPAN_CELSIUS);
}

function zoneNameKey(index: number): TranslationKey {
  return ZONE_NAME_KEYS[index] ?? ZONE_NAME_KEYS[0];
}
