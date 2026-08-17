import type {
  SaveFailure,
  SaveOutcome,
  WriteOutcome,
} from "@/domain/SaveOutcome";
import type { TranslationKey } from "@/i18n/keys";

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

export type PressReports = {
  /** `save()` rethrows what the write threw; a press that dropped it would report nothing at all. */
  onFailure: () => void;
  /** A save validation refuses never reaches the module, and has to say so rather than do nothing. */
  onBlocked: () => void;
};

export function savePress(
  form: { save: () => Promise<void>; saving: boolean; blocked: boolean },
  reports: PressReports,
): { onPress: () => void; busy: boolean } {
  return {
    onPress: () => {
      // save() paints the offending fields even when it refuses to send, so it runs either way.
      form.save().catch(reports.onFailure);
      if (form.blocked) reports.onBlocked();
    },
    busy: form.saving,
  };
}

/** Read from the outcome, never from the fact that the save resolved: a blocked save resolves too. */
export function saveMessage(
  outcome: SaveOutcome,
  copy: SaveCopy,
  t: Translate,
): string {
  if (outcome.status === "applied") return t(copy.applied);
  return sentencePerOutcome(outcome.failures, copy, t).join(" ");
}

/**
 * One sentence per kind of failure, naming every field it covers. A whole-form save writes twelve
 * fields over four channels: naming one of four reads as "the rest went through", and describing
 * all four with the first one's status says a refused field went silent, or the reverse.
 */
function sentencePerOutcome(
  failures: readonly SaveFailure[],
  copy: SaveCopy,
  t: Translate,
): string[] {
  const byStatus = new Map<WriteOutcome["status"], Set<string>>();
  for (const failure of failures) {
    const status = failure.outcome.status;
    const named = byStatus.get(status) ?? new Set<string>();
    named.add(t(copy.fieldName(failure)));
    byStatus.set(status, named);
  }

  return [...byStatus].map(([status, named]) =>
    t(FAILURE_COPY[status], { field: [...named].join(", ") }),
  );
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
