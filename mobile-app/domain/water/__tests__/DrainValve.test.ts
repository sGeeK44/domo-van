import { describe, expect, it } from "vitest";
import { DrainValve } from "@/domain/water/DrainValve";
import { FakeChannel } from "@/infrastructure/fake/FakeChannel";

function openValve(): { valve: DrainValve; channel: FakeChannel } {
  const channel = new FakeChannel();
  const valve = new DrainValve(channel);
  channel.emit("COUNTDOWN:30");
  return { valve, channel };
}

describe("DrainValve", () => {
  it("tells an auto-close apart from the closure the user asked for", () => {
    const { valve, channel } = openValve();

    channel.emit("AUTO_CLOSED");

    expect(valve.getValue()).toMatchObject({
      position: "closed",
      remainingSeconds: 0,
      lastClosure: "auto",
    });
  });

  it("reads a closure the user asked for as manual", () => {
    const { valve, channel } = openValve();

    channel.emit("CLOSED");

    expect(valve.getValue().lastClosure).toBe("manual");
  });

  it("forgets the last closure once the valve is open again", () => {
    const { valve, channel } = openValve();
    channel.emit("AUTO_CLOSED");

    channel.emit("COUNTDOWN:30");

    expect(valve.getValue()).toMatchObject({
      position: "open",
      lastClosure: null,
    });
  });

  it("reports the closure it asked for before the module confirms it", async () => {
    const { valve } = openValve();

    await valve.close();

    expect(valve.getValue().lastClosure).toBe("manual");
  });
});
