/** Scripted firmware: the frames a module answers one command with. */
export type ChannelScenario = (command: string) => readonly string[];

/**
 * Frames a module pushes unprompted, the way the valve counts its relay down.
 * The scenario's own state decides when it speaks: an empty tick says nothing.
 */
export type ChannelCadence = {
  intervalMs: number;
  next(): readonly string[];
};

/** A channel that answers commands and speaks on its own. */
export type ChannelScript = {
  respond: ChannelScenario;
  cadence?: ChannelCadence;
};

/** A whole module's scripted firmware, keyed by channel id. */
export type ModuleScenario = Record<string, ChannelScenario | ChannelScript>;

const SILENT: ChannelScenario = () => [];

/** A channel scripted as a bare function is one that never speaks first. */
export function asScript(
  entry: ChannelScenario | ChannelScript | undefined,
): ChannelScript {
  if (!entry) return { respond: SILENT };
  return typeof entry === "function" ? { respond: entry } : entry;
}
