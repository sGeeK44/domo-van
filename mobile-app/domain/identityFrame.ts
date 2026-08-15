import { type RejectedWrite, rejectedWrite } from "@/domain/SaveOutcome";

const LOWEST_PRINTABLE = 0x20;
const DELETE = 0x7f;

export type ModuleIdentity = {
  name: string;
  pin: string;
};

/** A control character would split the command into two frames, and two acks; the module's own codes name why. */
export function unsendableIdentity(
  identity: ModuleIdentity,
): RejectedWrite | null {
  if (hasControlCharacter(identity.name)) {
    return rejectedWrite("ERR_NAME_CHARS");
  }
  if (hasControlCharacter(identity.pin)) return rejectedWrite("ERR_PIN_NUM");
  return null;
}

function hasControlCharacter(value: string): boolean {
  for (const character of value) {
    const code = character.codePointAt(0) ?? 0;
    if (code < LOWEST_PRINTABLE || code === DELETE) return true;
  }
  return false;
}
