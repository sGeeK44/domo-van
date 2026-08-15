import type {
  SaveFailure,
  SaveOutcome,
  WriteOutcome,
} from "@/domain/SaveOutcome";
import type { TranslationKey } from "@/i18n/keys";

/** What a save is announced as: a sentence, and the field it names. */
export type SaveReport = { key: TranslationKey; fieldKey?: TranslationKey };

/** `t`, narrowed to what a report needs; the dictionary owns every word of it. */
export type Translate = (
  key: TranslationKey,
  params?: { field: string },
) => string;

export type SaveCopy = {
  applied: TranslationKey;
  /** The form owns its field names: only it knows which fields it writes. */
  fieldName: (failure: SaveFailure) => TranslationKey;
};

const FAILURE_COPY = {
  applied: "water.save.sent",
  rejected: "water.save.refused",
  timedOut: "water.save.notConfirmed",
  unreachable: "water.save.unreachable",
} as const satisfies Record<WriteOutcome["status"], TranslationKey>;

/** Read from the outcome, never from the fact that the save resolved: a blocked save resolves too. */
export function saveReport(outcome: SaveOutcome, copy: SaveCopy): SaveReport {
  const failure = outcome.status === "failed" ? outcome.failures[0] : undefined;
  if (!failure) return { key: copy.applied };

  return {
    key: FAILURE_COPY[failure.outcome.status],
    fieldKey: copy.fieldName(failure),
  };
}

export function saveMessage(
  outcome: SaveOutcome,
  copy: SaveCopy,
  t: Translate,
): string {
  const report = saveReport(outcome, copy);
  if (!report.fieldKey) return t(report.key);
  return t(report.key, { field: t(report.fieldKey) });
}

const REFUSED_FIELD: Record<string, TranslationKey> = {
  ERR_NAME_LEN: "water.save.fields.name",
  ERR_NAME_CHARS: "water.save.fields.name",
  ERR_PIN_LEN: "water.save.fields.pin",
  ERR_PIN_NUM: "water.save.fields.pin",
};

/** Name and PIN travel as one command, so the module's own code is what tells the two apart. */
export function identityFieldName(failure: SaveFailure): TranslationKey {
  if (failure.outcome.status !== "rejected")
    return "water.save.fields.identity";
  return REFUSED_FIELD[failure.outcome.code] ?? "water.save.fields.identity";
}
