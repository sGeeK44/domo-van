import { moduleAccent } from "@/components/module-accent";
import type { IconName, Palette } from "@/design-system";
import type { ModuleKey } from "@/domain/modules/ModuleDescriptor";
import type { ModuleSlot } from "@/domain/modules/ModuleSlot";
import type { TranslationKey } from "@/i18n/keys";

export type ModuleSettingsRow = {
  moduleKey: ModuleKey;
  icon: IconName;
  iconBackground: string;
  titleKey: TranslationKey;
  subtitleKey: TranslationKey;
  /** Paired shows the edit/unpair controls; unpaired dims the row and offers to add. */
  paired: boolean;
};

/** The mockup's order, which is not the catalogue's: Eau, Chauffage, Batterie. */
const ROWS = [
  {
    moduleKey: "water",
    icon: "water-drop",
    titleKey: "settings.rows.water",
    subtitleKey: "settings.rows.waterSubtitle",
  },
  {
    moduleKey: "heater",
    icon: "local-fire-department",
    titleKey: "settings.rows.heater",
    subtitleKey: "settings.rows.heaterSubtitle",
  },
  {
    moduleKey: "battery",
    icon: "battery-charging-full",
    titleKey: "settings.rows.battery",
    subtitleKey: "settings.rows.batterySubtitle",
  },
] as const satisfies readonly Omit<
  ModuleSettingsRow,
  "iconBackground" | "paired"
>[];

export function moduleSettingsRows(
  slots: readonly ModuleSlot[],
  colors: Palette,
): readonly ModuleSettingsRow[] {
  return ROWS.map((row) => ({
    ...row,
    iconBackground: moduleAccent(colors, row.moduleKey),
    paired: isPaired(slots, row.moduleKey),
  }));
}

function isPaired(slots: readonly ModuleSlot[], key: ModuleKey): boolean {
  const slot = slots.find((candidate) => candidate.module.key === key);
  return slot?.pairing != null;
}
