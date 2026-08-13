import { describe, expect, it } from "vitest";
import { FakeChannel } from "@/infrastructure/fake/FakeChannel";
import { FakeModuleTransport } from "@/infrastructure/fake/FakeModuleTransport";
import { waterScenario } from "@/infrastructure/fake/scenarios/waterScenario";

describe("FakeChannel", () => {
  it("delivers the frames the scenario answers a command with", async () => {
    const received: string[] = [];
    const channel = new FakeChannel((command) =>
      command === "PING?" ? ["PONG", "OK"] : [],
    );
    channel.listen((frame) => received.push(frame));

    await channel.send("PING?");

    expect(received).toEqual(["PONG", "OK"]);
  });

  it("stays silent on a command the scenario does not script", async () => {
    const received: string[] = [];
    const channel = new FakeChannel(() => []);
    channel.listen((frame) => received.push(frame));

    await channel.send("WHAT?");

    expect(received).toEqual([]);
    expect(channel.commands).toEqual(["WHAT?"]);
  });

  it("drops a listener that unsubscribed", async () => {
    const received: string[] = [];
    const channel = new FakeChannel(() => ["OK"]);

    channel.listen((frame) => received.push(frame))();
    await channel.send("PING?");

    expect(received).toEqual([]);
    expect(channel.listenerCount).toBe(0);
  });
});

describe("FakeModuleTransport", () => {
  it("hands the same channel back for a channel id already open", () => {
    const transport = new FakeModuleTransport(waterScenario());

    const opened = transport.openChannel("0002");

    expect(transport.channel("0002")).toBe(opened);
  });

  it("opens an unscripted channel id rather than failing", async () => {
    const transport = new FakeModuleTransport(waterScenario());

    await transport.openChannel("9999").send("CFG?");

    expect(transport.channel("9999").commands).toEqual(["CFG?"]);
  });

  it("gives each channel id the frames its own scenario answers", async () => {
    const received: string[] = [];
    const transport = new FakeModuleTransport(waterScenario());

    transport.channel("0002").listen((frame) => received.push(frame));
    await transport.openChannel("0002").send("CFG?");

    expect(received).toEqual(["CFG:V=100;H=200", "56"]);
  });
});
