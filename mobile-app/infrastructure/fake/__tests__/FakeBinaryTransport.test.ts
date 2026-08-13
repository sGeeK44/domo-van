import { afterEach, describe, expect, it, vi } from "vitest";
import { BatterySystem } from "@/domain/battery/BatterySystem";
import { buildReadAllCommand } from "@/domain/battery/JkBmsProtocol";
import { FakeBinaryTransport } from "@/infrastructure/fake/FakeBinaryTransport";
import { JK_BMS_NOMINAL_FRAME } from "@/infrastructure/fake/scenarios/jkBmsFrames";

const SILENT = { frames: [] };

function collect(transport: FakeBinaryTransport) {
  const chunks: Uint8Array[] = [];
  const stop = transport.listen((bytes) => chunks.push(bytes));
  return { chunks, stop };
}

describe("FakeBinaryTransport", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("stays silent until something asks it to replay", () => {
    const transport = new FakeBinaryTransport();
    const { chunks } = collect(transport);
    expect(chunks).toHaveLength(0);

    transport.replay();

    expect(chunks).toHaveLength(3);
    expect(chunks.at(-1)).toEqual(JK_BMS_NOMINAL_FRAME);
  });

  it("leaves the listeners already subscribed untouched when another joins", () => {
    const transport = new FakeBinaryTransport();
    const first = collect(transport);
    transport.replay();

    collect(transport);

    expect(first.chunks).toHaveLength(3);
  });

  it("answers a read-all command with the corpus", () => {
    const transport = new FakeBinaryTransport();
    const { chunks } = collect(transport);

    void transport.send(buildReadAllCommand());

    expect(chunks.at(-1)).toEqual(JK_BMS_NOMINAL_FRAME);
    expect(transport.sent).toHaveLength(1);
  });

  it("stays silent on a command it does not recognise", () => {
    const transport = new FakeBinaryTransport();
    const { chunks } = collect(transport);

    void transport.send(new Uint8Array([0x4e, 0x57, 0x00]));

    expect(chunks).toHaveLength(0);
  });

  it("keeps emitting on its own cadence, since telemetry is BMS-initiated", () => {
    vi.useFakeTimers();
    const transport = new FakeBinaryTransport({
      frames: [JK_BMS_NOMINAL_FRAME],
      intervalMs: 1000,
    });
    const { chunks } = collect(transport);

    vi.advanceTimersByTime(2000);

    expect(chunks).toHaveLength(2);
  });

  it("stops its cadence once the last listener leaves", () => {
    vi.useFakeTimers();
    const transport = new FakeBinaryTransport({
      frames: [JK_BMS_NOMINAL_FRAME],
      intervalMs: 1000,
    });
    const { chunks, stop } = collect(transport);

    stop();
    vi.advanceTimersByTime(5000);

    expect(chunks).toHaveLength(0);
    expect(vi.getTimerCount()).toBe(0);
  });

  it("stops its cadence on dispose, listener or no listener", () => {
    vi.useFakeTimers();
    const transport = new FakeBinaryTransport({
      frames: [JK_BMS_NOMINAL_FRAME],
      intervalMs: 1000,
    });
    collect(transport);

    transport.dispose();
    vi.advanceTimersByTime(5000);

    expect(transport.listenerCount).toBe(0);
    expect(vi.getTimerCount()).toBe(0);
  });

  it("delivers to every listener, not just the last one to subscribe", () => {
    const transport = new FakeBinaryTransport(SILENT);
    const first = collect(transport);
    const second = collect(transport);

    transport.emit([0x01, 0x02]);

    expect(first.chunks).toEqual([new Uint8Array([0x01, 0x02])]);
    expect(second.chunks).toEqual([new Uint8Array([0x01, 0x02])]);
  });

  it("stops delivering to a listener that unsubscribed", () => {
    const transport = new FakeBinaryTransport(SILENT);
    const { chunks, stop } = collect(transport);

    stop();
    transport.emit([0x01]);

    expect(chunks).toHaveLength(0);
  });
});

describe("BatterySystem driven by the fake transport", () => {
  it("publishes the recorded telemetry with no radio in the room", () => {
    const transport = new FakeBinaryTransport();

    const system = new BatterySystem(transport);

    expect(system.getValue()).toMatchObject({ percentage: 98, cellCount: 4 });
    expect(system.getValue().cellVoltages).toEqual([3.3, 3.301, 3.299, 3.302]);
    system.dispose();
  });

  it("notifies its subscribers when a later frame arrives", () => {
    const transport = new FakeBinaryTransport(SILENT);
    const system = new BatterySystem(transport);
    const snapshots: number[] = [];
    system.subscribe((snapshot) => snapshots.push(snapshot.percentage));

    transport.emit(JK_BMS_NOMINAL_FRAME);

    expect(snapshots).toEqual([98]);
    system.dispose();
  });

  it("unsubscribes from the transport when disposed", () => {
    const transport = new FakeBinaryTransport(SILENT);
    const system = new BatterySystem(transport);
    expect(transport.listenerCount).toBe(1);

    system.dispose();

    expect(transport.listenerCount).toBe(0);
  });
});
