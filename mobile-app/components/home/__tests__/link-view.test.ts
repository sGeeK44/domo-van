import { describe, expect, it } from "vitest";
import {
  linkSubtitle,
  linkTone,
  reconnectAction,
} from "@/components/home/link-view";

const NOW = Date.UTC(2026, 0, 1, 12, 0, 0);
const MINUTE = 60_000;

describe("linkTone", () => {
  it("speaks the same three states every surface shows", () => {
    expect(linkTone({ status: "online", since: NOW })).toBe("connected");
    expect(linkTone({ status: "connecting" })).toBe("loading");
    expect(linkTone({ status: "offline", lastContactAt: null })).toBe(
      "disconnected",
    );
  });
});

describe("linkSubtitle", () => {
  it("says nothing about a module that is online", () => {
    expect(linkSubtitle({ status: "online", since: NOW }, NOW)).toBeNull();
  });

  it("reports a pairing that never reached a link", () => {
    expect(linkSubtitle({ status: "offline", lastContactAt: null }, NOW)).toBe(
      "Jamais connecté",
    );
  });

  it("reports the time of last contact of a module that dropped", () => {
    const cases: [number, string][] = [
      [30_000, "Dernier contact à l'instant"],
      [5 * MINUTE, "Dernier contact il y a 5 min"],
      [3 * 60 * MINUTE, "Dernier contact il y a 3 h"],
      [2 * 24 * 60 * MINUTE, "Dernier contact il y a 2 j"],
    ];

    for (const [elapsed, expected] of cases) {
      const link = { status: "offline" as const, lastContactAt: NOW - elapsed };
      expect(linkSubtitle(link, NOW)).toBe(expected);
    }
  });

  it("reports a reconnection in progress", () => {
    expect(linkSubtitle({ status: "connecting" }, NOW)).toBe("Connexion…");
  });
});

describe("reconnectAction", () => {
  it("offers nothing while the module is online", () => {
    expect(reconnectAction({ status: "online", since: NOW })).toBeNull();
  });

  it("offers a reconnection to a module that dropped", () => {
    expect(reconnectAction({ status: "offline", lastContactAt: NOW })).toEqual({
      label: "Reconnecter",
      disabled: false,
    });
  });

  it("cannot be triggered twice: it is disabled while connecting", () => {
    expect(reconnectAction({ status: "connecting" })).toEqual({
      label: "Reconnexion…",
      disabled: true,
    });
  });
});
