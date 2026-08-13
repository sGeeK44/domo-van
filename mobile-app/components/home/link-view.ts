import type { LinkState } from "@/domain/modules/ModuleSlot";

/** The three-state vocabulary every surface showing a link speaks. */
export type LinkTone = "connected" | "loading" | "disconnected";

export type ReconnectAction = { label: string; disabled: boolean };

const MINUTE_MS = 60_000;
const HOUR_MS = 60 * MINUTE_MS;
const DAY_MS = 24 * HOUR_MS;

export function linkTone(link: LinkState): LinkTone {
  if (link.status === "online") return "connected";
  return link.status === "connecting" ? "loading" : "disconnected";
}

export function linkSubtitle(link: LinkState, now: number): string | null {
  if (link.status === "online") return null;
  if (link.status === "connecting") return "Connexion…";
  if (link.lastContactAt === null) return "Jamais connecté";
  return `Dernier contact ${elapsedSince(link.lastContactAt, now)}`;
}

export function reconnectAction(link: LinkState): ReconnectAction | null {
  if (link.status === "online") return null;
  return link.status === "connecting"
    ? { label: "Reconnexion…", disabled: true }
    : { label: "Reconnecter", disabled: false };
}

function elapsedSince(lastContactAt: number, now: number): string {
  const elapsed = Math.max(0, now - lastContactAt);
  if (elapsed < MINUTE_MS) return "à l'instant";
  if (elapsed < HOUR_MS) return `il y a ${Math.floor(elapsed / MINUTE_MS)} min`;
  if (elapsed < DAY_MS) return `il y a ${Math.floor(elapsed / HOUR_MS)} h`;
  return `il y a ${Math.floor(elapsed / DAY_MS)} j`;
}
