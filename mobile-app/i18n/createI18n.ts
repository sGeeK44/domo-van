import i18next, { type i18n } from "i18next";
import { initReactI18next } from "react-i18next";
import { DEFAULT_NAMESPACE } from "@/i18n/keys";
import { DEFAULT_LANGUAGE, type Language } from "@/i18n/language";
import { en } from "@/i18n/resources/en";
import { fr } from "@/i18n/resources/fr";

export function createI18n(language: Language): i18n {
  const instance = i18next.createInstance();

  // resources are inline, so init resolves before the first render and no screen paints a raw key
  void instance.use(initReactI18next).init({
    lng: language,
    fallbackLng: DEFAULT_LANGUAGE,
    defaultNS: DEFAULT_NAMESPACE,
    resources: {
      fr: { [DEFAULT_NAMESPACE]: fr },
      en: { [DEFAULT_NAMESPACE]: en },
    },
    // React escapes what it renders; escaping here would double-encode an apostrophe
    interpolation: { escapeValue: false },
  });

  return instance;
}
