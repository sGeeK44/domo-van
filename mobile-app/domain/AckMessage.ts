export type AckMessage = { type: "ok" } | { type: "error"; code: string };

/** Every module answers a command with either "OK" or "ERR_<reason>". */
export function parseAckMessage(msg: string): AckMessage | null {
  const trimmed = msg.trim();
  if (trimmed === "OK") return { type: "ok" };
  if (trimmed.startsWith("ERR_")) return { type: "error", code: trimmed };
  return null;
}
