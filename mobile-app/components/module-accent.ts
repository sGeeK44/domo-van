import type { Palette } from "@/design-system";
import type { ModuleKey } from "@/domain/modules/ModuleDescriptor";

/** The design system names no module and the domain names no colour, so the map lives here. */
const ACCENT_FILL = {
  water: "cleanWater",
  heater: "heat",
  battery: "battery",
} as const satisfies Record<ModuleKey, keyof Palette["fill"]>;

export function moduleAccent(colors: Palette, key: ModuleKey): string {
  return colors.fill[ACCENT_FILL[key]];
}
