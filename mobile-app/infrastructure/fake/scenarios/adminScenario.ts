import type { ChannelScenario } from "@/infrastructure/fake/scenarios/Scenario";

// What the firmware refuses to store, see shared-libs/protocol/AdminProtocol.cpp.
const PIN_DIGITS = 6;
const MAX_NAME_LENGTH = 20;
const NAME_CHARS = /^[a-zA-Z0-9 _-]+$/;
const IDENTITY_WRITE = /^ID:NAME=(.*?);PIN=(.*)$/;

function nameError(name: string): string | null {
  if (name.length < 1 || name.length > MAX_NAME_LENGTH) return "ERR_NAME_LEN";
  if (!NAME_CHARS.test(name)) return "ERR_NAME_CHARS";
  return null;
}

function pinError(pin: string): string | null {
  if (pin.length !== PIN_DIGITS) return "ERR_PIN_LEN";
  if (!/^\d+$/.test(pin)) return "ERR_PIN_NUM";
  return null;
}

export function adminScenario(): ChannelScenario {
  return (command) => {
    if (command.startsWith("ID:")) {
      const written = IDENTITY_WRITE.exec(command);
      if (!written) return ["ERR_ID_FMT"];
      const refusal = nameError(written[1]) ?? pinError(written[2]);
      return [refusal ?? "OK"];
    }
    if (command.startsWith("PIN:")) {
      return [pinError(command.slice("PIN:".length)) ?? "OK"];
    }
    if (command.startsWith("NAME:")) {
      return [nameError(command.slice("NAME:".length)) ?? "OK"];
    }
    return ["ERR_UNKNOWN_CMD"];
  };
}
