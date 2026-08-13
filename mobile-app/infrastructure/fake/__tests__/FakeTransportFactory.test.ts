import { afterEach, describe, expect, it, vi } from "vitest";
import { HEATER_MODULE, WATER_MODULE } from "@/domain/modules/ModuleDescriptor";
import type { DeviceHandle } from "@/domain/ports/DeviceHandle";
import {
  FakeTransportFactory,
  UnscriptedServiceError,
} from "@/infrastructure/fake/FakeTransportFactory";

const HEATER_SERVICE = HEATER_MODULE.serviceId as string;
const WATER_SERVICE = WATER_MODULE.serviceId as string;
const FIRST_ZONE = "0002";

const heaterDevice: DeviceHandle = { id: "fake-heater", name: "Heater" };
const otherDevice: DeviceHandle = { id: "fake-other", name: "Other" };

function replies(frames: string[]): (frame: string) => void {
  return (frame) => frames.push(frame);
}

describe("FakeTransportFactory", () => {
  afterEach(() => vi.useRealTimers());

  it("serves one transport per device and service", () => {
    const factory = new FakeTransportFactory();

    const transport = factory.moduleTransport(heaterDevice, HEATER_SERVICE);

    expect(factory.moduleTransport(heaterDevice, HEATER_SERVICE)).toBe(
      transport,
    );
  });

  it("remembers a setpoint written before the system was rebuilt", async () => {
    const factory = new FakeTransportFactory();
    const zone = factory
      .moduleTransport(heaterDevice, HEATER_SERVICE)
      .openChannel(FIRST_ZONE);
    await zone.send("SP:230");

    const rebuilt = factory
      .moduleTransport(heaterDevice, HEATER_SERVICE)
      .openChannel(FIRST_ZONE);
    const frames: string[] = [];
    rebuilt.listen(replies(frames));
    await rebuilt.send("SP?");

    expect(frames).toEqual(["SP:230"]);
  });

  it("gives another device its own firmware", async () => {
    const factory = new FakeTransportFactory();
    const zone = factory
      .moduleTransport(heaterDevice, HEATER_SERVICE)
      .openChannel(FIRST_ZONE);
    await zone.send("SP:230");

    const otherZone = factory
      .moduleTransport(otherDevice, HEATER_SERVICE)
      .openChannel(FIRST_ZONE);
    const frames: string[] = [];
    otherZone.listen(replies(frames));
    await otherZone.send("SP?");

    expect(frames).toEqual(["SP:210"]);
  });

  it("scripts a different firmware per service", async () => {
    const factory = new FakeTransportFactory();

    const tank = factory
      .moduleTransport(heaterDevice, WATER_SERVICE)
      .openChannel(FIRST_ZONE);
    const frames: string[] = [];
    tank.listen(replies(frames));
    await tank.send("CFG?");

    expect(frames).toEqual(["CFG:V=100;H=200", "56"]);
  });

  it("refuses a service no scenario is scripted for", () => {
    const factory = new FakeTransportFactory();

    expect(() => factory.moduleTransport(heaterDevice, "9999")).toThrow(
      UnscriptedServiceError,
    );
  });

  it("serves one binary transport per device", () => {
    const factory = new FakeTransportFactory();

    const transport = factory.binaryTransport(heaterDevice);

    expect(factory.binaryTransport(heaterDevice)).toBe(transport);
    expect(factory.binaryTransport(otherDevice)).not.toBe(transport);
  });

  it("leaves the BMS silent when no cadence is asked for", () => {
    vi.useFakeTimers();
    const factory = new FakeTransportFactory();
    const pushed: Uint8Array[] = [];

    factory.binaryTransport(heaterDevice).listen((bytes) => pushed.push(bytes));
    vi.advanceTimersByTime(10_000);

    expect(pushed).toHaveLength(0);
  });

  it("pushes BMS frames on the cadence it was given", () => {
    vi.useFakeTimers();
    const factory = new FakeTransportFactory({ telemetryIntervalMs: 500 });
    const pushed: Uint8Array[] = [];

    factory.binaryTransport(heaterDevice).listen((bytes) => pushed.push(bytes));
    vi.advanceTimersByTime(1_200);

    expect(pushed.length).toBeGreaterThan(0);
  });
});
