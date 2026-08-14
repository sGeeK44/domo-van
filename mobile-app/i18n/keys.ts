import type { ParseKeys } from "i18next";
import type { fr } from "@/i18n/resources/fr";

export const DEFAULT_NAMESPACE = "translation";

/** Every dotted path the dictionary defines. An unknown key is a type error, not a missing string. */
export type TranslationKey = ParseKeys;

declare module "i18next" {
  interface CustomTypeOptions {
    defaultNS: typeof DEFAULT_NAMESPACE;
    resources: { translation: typeof fr };
  }
}
