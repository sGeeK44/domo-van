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
  applied: "settings.save.sent",
  rejected: "settings.save.refused",
  timedOut: "settings.save.notConfirmed",
  unreachable: "settings.save.unreachable",
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

/**
 * Whether the module's word now overrides the draft. A refusal is authoritative — the module
 * kept what it had — but silence tells us nothing, and that is when the user retries.
 */
export function moduleHasTheLastWord(outcome: SaveOutcome): boolean {
  if (outcome.status === "applied") return true;
  return outcome.failures.every(
    (failure) => failure.outcome.status === "rejected",
  );
}

/** `save()` rethrows what the write threw, so a press that dropped it would report nothing at all. */
export function savePress(
  form: { save: () => Promise<void>; saving: boolean },
  onFailure: () => void,
): { onPress: () => void; busy: boolean } {
  return {
    onPress: () => {
      form.save().catch(onFailure);
    },
    busy: form.saving,
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
  ERR_NAME_LEN: "settings.save.fields.name",
  ERR_NAME_CHARS: "settings.save.fields.name",
  ERR_PIN_LEN: "settings.save.fields.pin",
  ERR_PIN_NUM: "settings.save.fields.pin",
};

/** Name and PIN travel as one command, so the module's own code is what tells the two apart. */
export function identityFieldName(failure: SaveFailure): TranslationKey {
  if (failure.outcome.status !== "rejected") {
    return "settings.save.fields.identity";
  }
  return REFUSED_FIELD[failure.outcome.code] ?? "settings.save.fields.identity";
}
