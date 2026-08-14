import { afterEach, describe, expect, it } from "vitest";
import { setLocalesForTest } from "@/__mocks__/expo-localization";
import { deviceLanguage, isSupportedLanguage } from "@/i18n/language";

afterEach(() => setLocalesForTest([{ languageCode: "fr" }]));

describe("the language the device asks for", () => {
  it("follows the first locale the device reports", () => {
    setLocalesForTest([{ languageCode: "en" }, { languageCode: "fr" }]);

    expect(deviceLanguage()).toBe("en");
  });

  it("falls back to French for a language the app does not carry", () => {
    setLocalesForTest([{ languageCode: "de" }]);

    expect(deviceLanguage()).toBe("fr");
  });

  it("falls back to French when the device reports no locale at all", () => {
    setLocalesForTest([]);

    expect(deviceLanguage()).toBe("fr");
  });

  it("falls back to French when the locale carries no language code", () => {
    setLocalesForTest([{ languageCode: null }]);

    expect(deviceLanguage()).toBe("fr");
  });
});

describe("isSupportedLanguage", () => {
  it("accepts only the languages the dictionaries cover", () => {
    expect(isSupportedLanguage("fr")).toBe(true);
    expect(isSupportedLanguage("en")).toBe(true);
    expect(isSupportedLanguage("de")).toBe(false);
    expect(isSupportedLanguage(null)).toBe(false);
  });
});
