import type { LinkState } from "@/domain/modules/ModuleSlot";
import type { TranslationKey } from "@/i18n/keys";

/** The three-state vocabulary every surface showing a link speaks. */
export type LinkTone = "connected" | "loading" | "disconnected";

/** A key and what to interpolate into it: the helper stays pure, the caller translates. */
export type LinkCopy = { key: TranslationKey; params?: { value: number } };

export type ReconnectAction = { labelKey: TranslationKey; disabled: boolean };

const MINUTE_MS = 60_000;
const HOUR_MS = 60 * MINUTE_MS;
const DAY_MS = 24 * HOUR_MS;

export function linkTone(link: LinkState): LinkTone {
  if (link.status === "online") return "connected";
  return link.status === "connecting" ? "loading" : "disconnected";
}

export function linkSubtitle(link: LinkState, now: number): LinkCopy | null {
  if (link.status === "online") return null;
  if (link.status === "connecting") return { key: "link.state.connecting" };
  if (link.lastContactAt === null) return { key: "link.state.neverConnected" };
  return elapsedSince(link.lastContactAt, now);
}

export function reconnectAction(link: LinkState): ReconnectAction | null {
  if (link.status === "online") return null;
  return link.status === "connecting"
    ? { labelKey: "link.actions.reconnecting", disabled: true }
    : { labelKey: "link.actions.reconnect", disabled: false };
}

function elapsedSince(lastContactAt: number, now: number): LinkCopy {
  const elapsed = Math.max(0, now - lastContactAt);
  if (elapsed < MINUTE_MS) return { key: "link.contact.justNow" };
  if (elapsed < HOUR_MS) {
    return {
      key: "link.contact.minutes",
      params: { value: Math.floor(elapsed / MINUTE_MS) },
    };
  }
  if (elapsed < DAY_MS) {
    return {
      key: "link.contact.hours",
      params: { value: Math.floor(elapsed / HOUR_MS) },
    };
  }
  return {
    key: "link.contact.days",
    params: { value: Math.floor(elapsed / DAY_MS) },
  };
}
