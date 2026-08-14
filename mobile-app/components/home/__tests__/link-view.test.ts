import { describe, expect, it } from "vitest";
import {
  type LinkCopy,
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
    expect(
      linkSubtitle({ status: "offline", lastContactAt: null }, NOW),
    ).toEqual({ key: "link.state.neverConnected" });
  });

  it("reports the time of last contact of a module that dropped", () => {
    const cases: [number, LinkCopy][] = [
      [30_000, { key: "link.contact.justNow" }],
      [5 * MINUTE, { key: "link.contact.minutes", params: { value: 5 } }],
      [3 * 60 * MINUTE, { key: "link.contact.hours", params: { value: 3 } }],
      [
        2 * 24 * 60 * MINUTE,
        { key: "link.contact.days", params: { value: 2 } },
      ],
    ];

    for (const [elapsed, expected] of cases) {
      const link = { status: "offline" as const, lastContactAt: NOW - elapsed };
      expect(linkSubtitle(link, NOW)).toEqual(expected);
    }
  });

  it("reports a reconnection in progress", () => {
    expect(linkSubtitle({ status: "connecting" }, NOW)).toEqual({
      key: "link.state.connecting",
    });
  });
});

describe("reconnectAction", () => {
  it("offers nothing while the module is online", () => {
    expect(reconnectAction({ status: "online", since: NOW })).toBeNull();
  });

  it("offers a reconnection to a module that dropped", () => {
    expect(reconnectAction({ status: "offline", lastContactAt: NOW })).toEqual({
      labelKey: "link.actions.reconnect",
      disabled: false,
    });
  });

  it("cannot be triggered twice: it is disabled while connecting", () => {
    expect(reconnectAction({ status: "connecting" })).toEqual({
      labelKey: "link.actions.reconnecting",
      disabled: true,
    });
  });
});
