// @vitest-environment jsdom
import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { linkSubtitle } from "@/components/home/link-view";
import { useLinkClock } from "@/components/home/use-link-clock";
import type { LinkState } from "@/domain/modules/ModuleSlot";

const DROPPED_AT = Date.UTC(2026, 0, 1, 10, 0, 0);
const MINUTE = 60_000;
const OFFLINE: LinkState = { status: "offline", lastContactAt: DROPPED_AT };
const ONLINE: LinkState = { status: "online", since: DROPPED_AT };

describe("the clock that ages an offline card's last contact", () => {
  beforeEach(() => {
    // Faking React's own scheduler timers would deadlock its rendering.
    vi.useFakeTimers({ toFake: ["setInterval", "clearInterval", "Date"] });
    vi.setSystemTime(DROPPED_AT);
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  it("ages the line while nothing else on the screen re-renders", () => {
    const { result } = renderHook(() => useLinkClock(OFFLINE));
    expect(linkSubtitle(OFFLINE, result.current)).toBe(
      "Dernier contact à l'instant",
    );

    act(() => {
      vi.advanceTimersByTime(45 * MINUTE);
    });

    expect(linkSubtitle(OFFLINE, result.current)).toBe(
      "Dernier contact il y a 45 min",
    );
  });

  it("runs no ticker while the module is online", () => {
    renderHook(() => useLinkClock(ONLINE));

    expect(vi.getTimerCount()).toBe(0);
  });

  it("stops ticking once the link comes back online", () => {
    const { rerender } = renderHook<number, { link: LinkState }>(
      ({ link }) => useLinkClock(link),
      { initialProps: { link: OFFLINE } },
    );
    expect(vi.getTimerCount()).toBe(1);

    rerender({ link: ONLINE });

    expect(vi.getTimerCount()).toBe(0);
  });

  it("clears its ticker on unmount", () => {
    const { unmount } = renderHook(() => useLinkClock(OFFLINE));
    expect(vi.getTimerCount()).toBe(1);

    unmount();

    expect(vi.getTimerCount()).toBe(0);
  });
});
