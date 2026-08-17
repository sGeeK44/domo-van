import { useRef, useState } from "react";
import type { TranslationKey } from "@/i18n/keys";

export type SettingsFormErrors<T> = Partial<Record<keyof T, TranslationKey>>;

export type SettingsForm<T> = {
  values: T;
  set: <K extends keyof T>(key: K, value: T[K]) => void;
  dirty: boolean;
  saving: boolean;
  /** What to paint — empty until a save has been tried, so a value nobody typed stays plain. */
  errors: SettingsFormErrors<T>;
  /** Whether validation would refuse a save, whether or not one has been tried yet. */
  blocked: boolean;
  save: () => Promise<void>;
};

export type SettingsFormOptions<T> = {
  /** What the module last reported; read while the draft is untouched. */
  reported: T;
  validate?: (values: T) => SettingsFormErrors<T>;
  /**
   * Resolves whether the module now has the last word on these fields: `true` when it
   * applied or refused them, `false` when it never confirmed — silence is what the user
   * retries, so the draft has to survive it. A rejection keeps the draft too: nothing was sent.
   */
  onSave: (values: T) => Promise<boolean>;
};

const NO_ERRORS = Object.freeze({});

/** No draft until the first keystroke, so telemetry flows through until then and no further. */
export function useSettingsForm<T extends object>({
  reported,
  validate,
  onSave,
}: SettingsFormOptions<T>): SettingsForm<T> {
  const [draft, setDraft] = useState<T | null>(null);
  const [saving, setSaving] = useState(false);
  const [tried, setTried] = useState(false);
  // A state flag would still let two presses in one tick through: neither has re-rendered.
  const inFlight = useRef(false);

  const values = draft ?? reported;
  const errors: SettingsFormErrors<T> = validate ? validate(values) : NO_ERRORS;

  const save = async () => {
    if (inFlight.current) return;
    // Before the early return: a save blocked by a field nobody typed has to show why.
    setTried(true);
    if (Object.keys(errors).length > 0) return;

    const sent = draft;
    inFlight.current = true;
    setSaving(true);
    try {
      const settled = await onSave(values);
      // Only what was sent goes back to the module's word: a keystroke since is newer than it.
      if (settled) setDraft((current) => (current === sent ? null : current));
    } finally {
      inFlight.current = false;
      setSaving(false);
    }
  };

  return {
    values,
    set: (key, value) =>
      setDraft((current) => ({ ...(current ?? reported), [key]: value })),
    dirty: draft !== null,
    saving,
    errors: tried ? errors : NO_ERRORS,
    blocked: Object.keys(errors).length > 0,
    save,
  };
}
