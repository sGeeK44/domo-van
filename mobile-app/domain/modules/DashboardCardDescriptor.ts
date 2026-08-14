export type DashboardCardKey =
  | "battery"
  | "cleanWater"
  | "greyWater"
  | "heater";

/** A card is not a module: one module can contribute several of them. */
export type DashboardCardDescriptor = {
  key: DashboardCardKey;
  /** Translation key, not copy — same rule as displayNameKey. */
  labelKey: `dashboard.cards.${DashboardCardKey}`;
  /** A plain string, so the catalogue names no icon set. */
  icon: string;
};
