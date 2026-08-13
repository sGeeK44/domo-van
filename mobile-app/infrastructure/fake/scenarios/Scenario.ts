/** Scripted firmware: the frames a module answers one command with. */
export type ChannelScenario = (command: string) => readonly string[];

/** A whole module's scripted firmware, keyed by channel id. */
export type ModuleScenario = Record<string, ChannelScenario>;
