import { describe, expect, it } from "vitest";
import type { DeviceHandle } from "@/domain/ports/DeviceHandle";
import { FakeChannel } from "@/infrastructure/fake/FakeChannel";
import {
  FakeModuleTransport,
  UnscriptedServiceError,
} from "@/infrastructure/fake/FakeModuleTransport";
import { waterScenario } from "@/infrastructure/fake/scenarios/waterScenario";

const HANDLE: DeviceHandle = { id: "off-vehicle", name: "Fake Module" };

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

  it("scripts the water module for a handle pointing at the water service", async () => {
    const received: string[] = [];
    const transport = FakeModuleTransport.forDevice(HANDLE, "0001");

    transport.channel("0002").listen((frame) => received.push(frame));
    await transport.openChannel("0002").send("CFG?");

    expect(received).toEqual(["CFG:V=100;H=200", "56"]);
  });

  it("scripts the heater module for a handle pointing at the heater service", async () => {
    const received: string[] = [];
    const transport = FakeModuleTransport.forDevice(HANDLE, "0002");

    transport.channel("0006").listen((frame) => received.push(frame));
    await transport.openChannel("0006").send("ENV?");

    expect(received).toEqual(["ENV:T=215;H=450;P=10132;EXT=120"]);
  });

  it("refuses a service it has no scenario for", () => {
    expect(() => FakeModuleTransport.forDevice(HANDLE, "9999")).toThrow(
      UnscriptedServiceError,
    );
  });
});
