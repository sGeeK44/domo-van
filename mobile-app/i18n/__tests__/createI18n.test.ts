import { describe, expect, it } from "vitest";
import { createI18n } from "@/i18n/createI18n";

describe("the i18next instance", () => {
  it("is usable the moment it is built, so no screen paints a raw key", () => {
    expect(createI18n("fr").isInitialized).toBe(true);
  });

  it("serves the language it was asked for", () => {
    expect(createI18n("fr").t("dashboard.title")).toBe("Bord");
    expect(createI18n("en").t("dashboard.title")).toBe("Home");
  });

  it("shows English copy on every screen once the device speaks English", () => {
    const i18n = createI18n("en");

    expect(i18n.t("modules.list.title")).toBe("Modules");
    expect(i18n.t("heater.zones.title")).toBe("Heating");
    expect(i18n.t("battery.overview.title")).toBe("Battery");
    expect(i18n.t("modules.water.tab")).toBe("Water");
  });

  it("falls back to French for a language it does not carry", () => {
    const i18n = createI18n("fr");
    void i18n.changeLanguage("de");

    expect(i18n.t("dashboard.title")).toBe("Bord");
  });

  it("interpolates without escaping: React escapes what it renders", () => {
    const rendered = createI18n("fr").t("modules.unpair.title", {
      module: "Eau & Chauff",
    });

    expect(rendered).toBe("Dissocier Eau & Chauff");
  });

  it("interpolates the values a screen builds", () => {
    const i18n = createI18n("fr");

    expect(i18n.t("link.contact.minutes", { value: 5 })).toBe(
      "Dernier contact il y a 5 min",
    );
    expect(i18n.t("heater.pid.card", { zone: "Salon" })).toBe("PID · Salon");
  });

  it("rejects an unknown key at compile time, not at runtime", () => {
    const i18n = createI18n("fr");

    // @ts-expect-error no such key exists in the dictionary
    expect(i18n.t("does.not.exist")).toBe("does.not.exist");
  });
});
