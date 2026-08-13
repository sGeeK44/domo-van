import type { ChannelScenario } from "@/infrastructure/fake/scenarios/Scenario";

export function adminScenario(): ChannelScenario {
  return (command) =>
    command.startsWith("NAME:") || command.startsWith("PIN:") ? ["OK"] : [];
}
