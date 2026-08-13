import { describe, expect, it } from "vitest";
import { FRAME, frame } from "@/domain/battery/__tests__/JkBmsFrames";
import { BatterySystem } from "@/domain/battery/BatterySystem";
import { buildReadAllCommand } from "@/domain/battery/JkBmsProtocol";
import type { DeviceHandle } from "@/domain/ports/DeviceHandle";
import { FakeBinaryTransport } from "@/infrastructure/fake/FakeBinaryTransport";
import { NotConnectedError } from "@/infrastructure/session/NotConnectedError";
import { PersistentBinaryTransport } from "@/infrastructure/session/PersistentBinaryTransport";

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

    expect(chunks).toHaveLength(1);
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
});
