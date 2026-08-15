import type { TankAndValveConfig } from "@/domain/water/WaterSystem";
import type { TranslationKey } from "@/i18n/keys";

/** What the user types: five strings, because a half-typed number is not a number yet. */
export type TankAndValveDraft = {
  cleanVolume: string;
  cleanHeight: string;
  greyVolume: string;
  greyHeight: string;
  autoCloseSeconds: string;
};

export type TankAndValveErrors = Partial<
  Record<keyof TankAndValveDraft, TranslationKey>
>;

const MAX_AUTO_CLOSE_SECONDS = 300;

const MEASURES = [
  "cleanVolume",
  "cleanHeight",
  "greyVolume",
  "greyHeight",
] as const;

export function tankAndValveErrors(
  draft: TankAndValveDraft,
): TankAndValveErrors {
  const errors: TankAndValveErrors = {};

  for (const measure of MEASURES) {
    if (!isPositiveInteger(draft[measure])) {
      errors[measure] = "water.settings.positiveInteger";
    }
  }

  if (!isPositiveInteger(draft.autoCloseSeconds)) {
    errors.autoCloseSeconds = "water.settings.positiveInteger";
  } else if (Number(draft.autoCloseSeconds) > MAX_AUTO_CLOSE_SECONDS) {
    errors.autoCloseSeconds = "water.settings.atMostFiveMinutes";
  }

  return errors;
}

/** Only ever called on a draft the validation passed, so every field parses. */
export function tankAndValveConfig(
  draft: TankAndValveDraft,
): TankAndValveConfig {
  return {
    cleanTank: {
      volumeLiters: Number(draft.cleanVolume),
      heightMm: Number(draft.cleanHeight),
    },
    greyTank: {
      volumeLiters: Number(draft.greyVolume),
      heightMm: Number(draft.greyHeight),
    },
    autoCloseSeconds: Number(draft.autoCloseSeconds),
  };
}

function isPositiveInteger(value: string): boolean {
  const trimmed = value.trim();
  return /^\d+$/.test(trimmed) && Number(trimmed) > 0;
}
