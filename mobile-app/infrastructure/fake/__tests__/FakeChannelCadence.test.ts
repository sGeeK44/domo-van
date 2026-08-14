import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { FakeChannel } from "@/infrastructure/fake/FakeChannel";
import { FakeModuleTransport } from "@/infrastructure/fake/FakeModuleTransport";
import { waterScenario } from "@/infrastructure/fake/scenarios/waterScenario";

const VALVE_CHANNEL = "0004";
const AUTO_CLOSE_SECONDS = 45;
const ONE_SECOND = 1000;

function collect(channel: { listen(listener: (frame: string) => void): void }) {
  const frames: string[] = [];
  channel.listen((frame) => frames.push(frame));
  return frames;
}

describe("a fake channel its module speaks on unprompted", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("says nothing on its own when the scenario only answers commands", () => {
    const channel = new FakeChannel(() => []);
    const frames = collect(channel);

    vi.advanceTimersByTime(10 * ONE_SECOND);

    expect(frames).toEqual([]);
  });

  it("pushes each tick the cadence answers with", () => {
    const channel = new FakeChannel(() => [], {
      intervalMs: ONE_SECOND,
      next: () => ["TICK"],
    });
    const frames = collect(channel);

    vi.advanceTimersByTime(3 * ONE_SECOND);

    expect(frames).toEqual(["TICK", "TICK", "TICK"]);
  });

  it("stops speaking once nobody listens: a module pushes to someone", () => {
    const channel = new FakeChannel(() => [], {
      intervalMs: ONE_SECOND,
      next: () => ["TICK"],
    });
    const frames: string[] = [];
    const stop = channel.listen((frame) => frames.push(frame));

    vi.advanceTimersByTime(ONE_SECOND);
    stop();
    vi.advanceTimersByTime(5 * ONE_SECOND);

    expect(frames).toEqual(["TICK"]);
  });
});

describe("the fake drain valve, which holds its own relay", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  function openValve() {
    const transport = new FakeModuleTransport(waterScenario());
    const channel = transport.channel(VALVE_CHANNEL);
    const frames = collect(channel);
    void channel.send("OPEN");
    return { channel, frames };
  }

  it("stays silent while it is closed", () => {
    const transport = new FakeModuleTransport(waterScenario());
    const frames = collect(transport.channel(VALVE_CHANNEL));

    vi.advanceTimersByTime(10 * ONE_SECOND);

    expect(frames).toEqual([]);
  });

  it("counts its own delay down, one frame a second", () => {
    const { frames } = openValve();

    vi.advanceTimersByTime(3 * ONE_SECOND);

    expect(frames).toEqual([
      `COUNTDOWN:${AUTO_CLOSE_SECONDS}`,
      "COUNTDOWN:44",
      "COUNTDOWN:43",
      "COUNTDOWN:42",
    ]);
  });

  it("closes itself at zero, and then has nothing more to say", () => {
    const { frames } = openValve();

    vi.advanceTimersByTime(AUTO_CLOSE_SECONDS * ONE_SECOND);
    const atAutoClose = [...frames];
    vi.advanceTimersByTime(10 * ONE_SECOND);

    expect(atAutoClose.at(-1)).toBe("AUTO_CLOSED");
    expect(frames).toEqual(atAutoClose);
  });

  it("stops counting down when the user closes it first", async () => {
    const { channel, frames } = openValve();

    vi.advanceTimersByTime(2 * ONE_SECOND);
    await channel.send("CLOSE");
    vi.advanceTimersByTime(10 * ONE_SECOND);

    expect(frames.at(-1)).toBe("CLOSED");
    expect(frames).not.toContain("AUTO_CLOSED");
  });
});
