import { describe, expect, it } from "vitest";
import { FRAME, frame } from "@/domain/battery/__tests__/JkBmsFrames";
import { BatterySystem } from "@/domain/battery/BatterySystem";
import { buildReadAllCommand } from "@/domain/battery/JkBmsProtocol";
import type { BinaryTransport } from "@/domain/ports/BinaryTransport";
import type { DeviceHandle } from "@/domain/ports/DeviceHandle";
import { FakeBinaryTransport } from "@/infrastructure/fake/FakeBinaryTransport";
import { NotConnectedError } from "@/infrastructure/session/NotConnectedError";
import { PersistentBinaryTransport } from "@/infrastructure/session/PersistentBinaryTransport";
import { TransportDisposedError } from "@/infrastructure/session/TransportDisposedError";

const DEVICE: DeviceHandle = { id: "fake-battery", name: "Battery (fake)" };

/** Field 0x85 alone: the pack now reports 50 % instead of the corpus' 98 %. */
const HALF_CHARGED = frame([0x85, 0x32]);

/** No corpus: these tests drive every byte themselves. */
const SILENT = { frames: [] };

function persistentTransport() {
  const sessions: FakeBinaryTransport[] = [];
  const transport = new PersistentBinaryTransport(() => {
    const session = new FakeBinaryTransport(SILENT);
    sessions.push(session);
    return session;
  });
  return { transport, sessions };
}

/** A stream that cannot be subscribed, as a stale device handle's cannot. */
const UNREACHABLE: BinaryTransport = {
  listen() {
    throw new Error("device is gone");
  },
  send: () => Promise.reject(new Error("device is gone")),
};

/** Lets a test break the next session, once a first one is bound. */
function flakyTransport() {
  const sessions: FakeBinaryTransport[] = [];
  const broken = { now: false };
  const transport = new PersistentBinaryTransport((): BinaryTransport => {
    if (broken.now) return UNREACHABLE;
    const session = new FakeBinaryTransport(SILENT);
    sessions.push(session);
    return session;
  });
  return { transport, sessions, broken };
}

describe("PersistentBinaryTransport", () => {
  it("keeps the last telemetry through a link drop and updates it on the next session", () => {
    const { transport, sessions } = persistentTransport();
    const battery = new BatterySystem(transport);

    transport.bind(DEVICE);
    sessions[0].emit(FRAME);
    expect(battery.getValue().percentage).toBe(98);

    transport.unbind();
    expect(battery.getValue().percentage).toBe(98);

    transport.bind(DEVICE);
    sessions[1].emit(HALF_CHARGED);
    expect(battery.getValue().percentage).toBe(50);
  });

  it("listens to the underlying stream exactly once per bind", () => {
    const { transport, sessions } = persistentTransport();
    new BatterySystem(transport);

    transport.bind(DEVICE);
    transport.unbind();
    transport.bind(DEVICE);

    expect(sessions[0].listenerCount).toBe(0);
    expect(sessions[1].listenerCount).toBe(1);
  });

  it("delivers a chunk once after a rebind, not once per session ever opened", () => {
    const { transport, sessions } = persistentTransport();
    const chunks: Uint8Array[] = [];
    transport.listen((chunk) => chunks.push(chunk));

    transport.bind(DEVICE);
    transport.unbind();
    transport.bind(DEVICE);
    sessions[1].emit(FRAME);

    expect(chunks).toEqual([new Uint8Array(FRAME)]);
  });

  it("drops the previous session when bound again without an unbind", () => {
    const { transport, sessions } = persistentTransport();
    new BatterySystem(transport);

    transport.bind(DEVICE);
    transport.bind(DEVICE);

    expect(sessions[0].listenerCount).toBe(0);
    expect(sessions[1].listenerCount).toBe(1);
  });

  it("rejects a write with NotConnectedError while no session is bound", async () => {
    const { transport } = persistentTransport();

    const writing = transport.send(buildReadAllCommand());

    await expect(writing).rejects.toThrow(NotConnectedError);
  });

  it("writes on the bound session", async () => {
    const { transport, sessions } = persistentTransport();
    transport.bind(DEVICE);

    await transport.send(buildReadAllCommand());

    expect(sessions[0].sent).toEqual([buildReadAllCommand()]);
  });

  it("keeps reading the previous session when a rebind fails", () => {
    const { transport, sessions, broken } = flakyTransport();
    const chunks: Uint8Array[] = [];
    transport.listen((chunk) => chunks.push(chunk));
    transport.bind(DEVICE);
    broken.now = true;

    expect(() => transport.bind(DEVICE)).toThrow();

    sessions[0].emit(FRAME);
    expect(chunks).toEqual([new Uint8Array(FRAME)]);
  });

  it("keeps writing to the previous session when a rebind fails", async () => {
    const { transport, sessions, broken } = flakyTransport();
    transport.bind(DEVICE);
    broken.now = true;

    expect(() => transport.bind(DEVICE)).toThrow();

    await transport.send(buildReadAllCommand());
    expect(sessions[0].sent).toEqual([buildReadAllCommand()]);
  });

  it("stays unbound when the first bind fails", async () => {
    const { transport, broken } = flakyTransport();
    broken.now = true;

    expect(() => transport.bind(DEVICE)).toThrow();

    await expect(transport.send(buildReadAllCommand())).rejects.toThrow(
      NotConnectedError,
    );
  });

  it("reads the next session's frames after a drop mid-frame", () => {
    const { transport, sessions } = persistentTransport();
    const battery = new BatterySystem(transport);
    transport.bind(DEVICE);
    sessions[0].emit(FRAME.slice(0, 4));

    transport.unbind();
    transport.bind(DEVICE);
    battery.resync();

    sessions[1].emit(HALF_CHARGED);
    expect(battery.getValue().percentage).toBe(50);
  });

  it("releases the underlying subscription when disposed", () => {
    const { transport, sessions } = persistentTransport();
    transport.bind(DEVICE);
    new BatterySystem(transport);

    transport.dispose();

    expect(sessions[0].listenerCount).toBe(0);
  });

  it("opens no further session once disposed", () => {
    const { transport, sessions } = persistentTransport();
    transport.bind(DEVICE);
    transport.dispose();

    transport.bind(DEVICE);

    expect(sessions).toHaveLength(1);
  });

  it("swallows a late unbind once disposed", () => {
    const { transport } = persistentTransport();
    transport.bind(DEVICE);
    transport.dispose();

    expect(() => transport.unbind()).not.toThrow();
  });

  it("hands out a listener that never fires once disposed", () => {
    const { transport, sessions } = persistentTransport();
    transport.bind(DEVICE);
    transport.dispose();

    const chunks: Uint8Array[] = [];
    transport.listen((chunk) => chunks.push(chunk));
    sessions[0].emit(FRAME);

    expect(chunks).toEqual([]);
  });

  it("rejects a write once disposed, so a caller retrying on a drop stops", async () => {
    const { transport } = persistentTransport();
    transport.bind(DEVICE);

    transport.dispose();

    await expect(transport.send(buildReadAllCommand())).rejects.toThrow(
      TransportDisposedError,
    );
  });
});
