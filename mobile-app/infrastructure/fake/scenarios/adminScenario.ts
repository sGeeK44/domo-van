import type { ChannelScenario } from "@/infrastructure/fake/scenarios/Scenario";

// What the firmware refuses to store, see shared-libs/protocol/AdminProtocol.cpp.
const PIN_DIGITS = 6;
const MAX_NAME_LENGTH = 20;

export function adminScenario(): ChannelScenario {
  return (command) => {
    if (command.startsWith("PIN:")) {
      const pin = command.slice("PIN:".length);
      if (pin.length !== PIN_DIGITS) return ["ERR_PIN_LEN"];
      if (!/^\d+$/.test(pin)) return ["ERR_PIN_NUM"];
      return ["OK"];
    }
    if (command.startsWith("NAME:")) {
      const name = command.slice("NAME:".length);
      if (name.length < 1 || name.length > MAX_NAME_LENGTH) {
        return ["ERR_NAME_LEN"];
      }
      return ["OK"];
    }
    return [];
  };
}
