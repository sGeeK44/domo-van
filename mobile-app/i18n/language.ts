import { getLocales } from "expo-localization";

export const SUPPORTED_LANGUAGES = ["fr", "en"] as const;

export type Language = (typeof SUPPORTED_LANGUAGES)[number];

export const DEFAULT_LANGUAGE: Language = "fr";

export function isSupportedLanguage(value: unknown): value is Language {
  return SUPPORTED_LANGUAGES.some((language) => language === value);
}

/** Reading the locale is all T3 does; persisting a chosen language belongs to the preferences port. */
export function deviceLanguage(): Language {
  const code = getLocales()[0]?.languageCode;
  return isSupportedLanguage(code) ? code : DEFAULT_LANGUAGE;
}
