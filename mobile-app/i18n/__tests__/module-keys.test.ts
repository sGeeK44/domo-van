import { describe, expect, it } from "vitest";
import { ALL_MODULES } from "@/domain/modules/ModuleDescriptor";
import { createI18n } from "@/i18n/createI18n";
import { SUPPORTED_LANGUAGES } from "@/i18n/language";

describe("the keys the module catalogue carries", () => {
  it("resolves to real copy in every language, so no tab shows a raw key", () => {
    for (const language of SUPPORTED_LANGUAGES) {
      const { t } = createI18n(language);

      for (const module of ALL_MODULES) {
        expect(t(module.displayNameKey)).not.toBe(module.displayNameKey);
        expect(t(module.tabTitleKey)).not.toBe(module.tabTitleKey);
      }
    }
  });

  it("names the tabs the bar shows, in catalogue order", () => {
    const { t } = createI18n("fr");

    expect(ALL_MODULES.map((module) => t(module.tabTitleKey))).toEqual([
      "Batt",
      "Eau",
      "Chauff",
    ]);
  });
});
