import { useRef, useState } from "react";
import type { TranslationKey } from "@/i18n/keys";

export type SettingsFormErrors<T> = Partial<Record<keyof T, TranslationKey>>;

export type SettingsForm<T> = {
  values: T;
  set: <K extends keyof T>(key: K, value: T[K]) => void;
  dirty: boolean;
  saving: boolean;
  errors: SettingsFormErrors<T>;
  save: () => Promise<void>;
};

export type SettingsFormOptions<T> = {
  /** What the module last reported; read while the draft is untouched. */
  reported: T;
  validate?: (values: T) => SettingsFormErrors<T>;
  /** Reports its outcome by resolving; a rejection keeps the draft, since nothing was applied. */
  onSave: (values: T) => Promise<void>;
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
  // A state flag would still let two presses in one tick through: neither has re-rendered.
  const inFlight = useRef(false);

  const values = draft ?? reported;
  const errors: SettingsFormErrors<T> = validate ? validate(values) : NO_ERRORS;

  const save = async () => {
    if (inFlight.current) return;
    if (Object.keys(errors).length > 0) return;

    inFlight.current = true;
    setSaving(true);
    try {
      await onSave(values);
      // Reported: the module is the source of truth again, refused value included.
      setDraft(null);
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
    errors,
    save,
  };
}
