import { describe, expect, it } from "vitest";
import { moduleAccent } from "@/components/module-accent";
import { Colors } from "@/design-system";
import { ALL_MODULES } from "@/domain/modules/ModuleDescriptor";

const THEMES = ["light", "dark"] as const;

describe("the accent a module's cards are barred with", () => {
  it.each(THEMES)("reads the palette's own fill (%s)", (theme) => {
    const colors = Colors[theme];

    expect(moduleAccent(colors, "water")).toBe(colors.fill.cleanWater);
    expect(moduleAccent(colors, "heater")).toBe(colors.fill.heat);
    expect(moduleAccent(colors, "battery")).toBe(colors.fill.battery);
  });

  it.each(THEMES)("answers for every module in the catalogue (%s)", (theme) => {
    const accents = ALL_MODULES.map((module) =>
      moduleAccent(Colors[theme], module.key),
    );

    expect(new Set(accents).size).toBe(ALL_MODULES.length);
  });
});
