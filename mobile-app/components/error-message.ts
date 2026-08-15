import type { TFunction } from "i18next";
import { ReportedError } from "@/domain/ReportedError";
import type { TranslationKey } from "@/i18n/keys";

/** A failure held as data, so a displayed one follows a language switch. */
export type ErrorReport = { cause: unknown; fallbackKey: TranslationKey };

/** Our own failures answer a key; a third-party message reaches the UI as it comes. */
export function errorMessage(
  cause: unknown,
  t: TFunction,
  fallbackKey: TranslationKey,
): string {
  if (cause instanceof ReportedError) return t(cause.messageKey);
  return cause instanceof Error ? cause.message : t(fallbackKey);
}
