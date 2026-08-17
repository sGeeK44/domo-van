import type { ModuleIdentity } from "@/domain/AdminModule";
import type { TranslationKey } from "@/i18n/keys";

export type IdentityDraft = { name: string; pin: string };

export type IdentityErrors = Partial<
  Record<keyof IdentityDraft, TranslationKey>
>;

export const MAX_NAME_LENGTH = 20;
const NAME_CHARSET = /^[A-Za-z0-9 _-]+$/;
const SIX_DIGITS = /^\d{6}$/;

export function identityErrors(draft: IdentityDraft): IdentityErrors {
  const errors: IdentityErrors = {};
  const name = draft.name.trim();

  if (name.length < 1 || name.length > MAX_NAME_LENGTH) {
    errors.name = "modules.admin.nameLength";
  } else if (!NAME_CHARSET.test(name)) {
    errors.name = "modules.admin.nameCharset";
  }

  if (!SIX_DIGITS.test(draft.pin)) errors.pin = "modules.admin.pinDigits";

  return errors;
}

export function moduleIdentity(draft: IdentityDraft): ModuleIdentity {
  return { name: draft.name.trim(), pin: draft.pin };
}
