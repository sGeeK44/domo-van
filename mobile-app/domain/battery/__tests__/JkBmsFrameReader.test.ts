import { describe, expect, it } from "vitest";
import { JkBmsFrameReader } from "@/domain/battery/JkBmsFrameReader";
import {
  buildCellInfoCommand,
  buildDeviceInfoCommand,
  parseCellInfo,
} from "@/domain/battery/JkBmsProtocol";
import {
  AT_KEEPALIVE,
  cellInfoFrame,
  FRAME,
  SETTINGS_FRAME,
  withBrokenChecksum,
} from "./JkBmsFrames";

describe("command builder", () => {
  it("builds the device-info request the physical BMS answered", () => {
    expect([...buildDeviceInfoCommand()]).toEqual([
      0xaa, 0x55, 0x90, 0xeb, 0x97, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
      0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x11,
    ]);
  });

  it("builds the cell-info request the physical BMS answered", () => {
    expect([...buildCellInfoCommand()]).toEqual([
      0xaa, 0x55, 0x90, 0xeb, 0x96, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
      0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x10,
    ]);
  });
});

describe("parseCellInfo", () => {
  it("reads every field of the frame captured off the physical BMS", () => {
    const data = parseCellInfo(new Uint8Array(FRAME));

    expect(data).not.toBeNull();
    expect(data?.cellVoltages).toEqual([3.322, 3.322, 3.322, 3.322]);
    expect(data?.voltage).toBeCloseTo(13.289, 3);
    expect(data?.power).toBeCloseTo(81.557, 3);
    expect(data?.current).toBeCloseTo(-6.137, 3);
    expect(data?.soc).toBe(85);
    expect(data?.remainingAh).toBeCloseTo(475.055, 3);
    expect(data?.nominalAh).toBeCloseTo(560, 3);
    expect(data?.cycleCount).toBe(12);
    expect(data?.tempMos).toBeCloseTo(23.1, 1);
    expect(data?.tempSensor1).toBeCloseTo(20.5, 1);
    expect(data?.tempSensor2).toBeCloseTo(20.8, 1);
    expect(data?.balancing).toBe(false);
    expect(data?.chargeMosfetOn).toBe(true);
    expect(data?.dischargeMosfetOn).toBe(true);
  });

  it("decodes a physically consistent picture, so the offsets line up", () => {
    const data = parseCellInfo(new Uint8Array(FRAME));
    if (!data) throw new Error("frame did not parse");

    expect(data.voltage * Math.abs(data.current)).toBeCloseTo(data.power, 1);
    expect(data.remainingAh / data.nominalAh).toBeCloseTo(data.soc / 100, 2);
  });

  it("reads a temperature below zero as negative", () => {
    const data = parseCellInfo(
      new Uint8Array(cellInfoFrame({ mosTempDeciC: -45 })),
    );

    expect(data?.tempMos).toBeCloseTo(-4.5, 1);
  });

  it("reads a charge as a positive current", () => {
    const data = parseCellInfo(
      new Uint8Array(cellInfoFrame({ currentMa: 2500 })),
    );

    expect(data?.current).toBeCloseTo(2.5, 3);
  });

  it("keeps a cell sensed at 0 V in its own place", () => {
    const data = parseCellInfo(
      new Uint8Array(cellInfoFrame({ cellVoltagesMv: [3352, 0, 3361, 3338] })),
    );

    expect(data?.cellVoltages).toEqual([3.352, 0, 3.361, 3.338]);
  });

  it("returns nothing for a record type the app does not consume", () => {
    expect(parseCellInfo(new Uint8Array(SETTINGS_FRAME))).toBeNull();
  });
});

describe("JkBmsFrameReader", () => {
  it("reads a frame delivered in one chunk", () => {
    const reader = new JkBmsFrameReader();

    const frames = reader.read(new Uint8Array(FRAME));

    expect(frames).toHaveLength(1);
    expect(frames[0].soc).toBe(85);
  });

  it("reassembles a frame fragmented as the MTU splits it", () => {
    const reader = new JkBmsFrameReader();
    const cuts = [128, 150, 278, 300];

    let start = 0;
    let frames: ReturnType<typeof reader.read> = [];
    for (const cut of cuts) {
      expect(frames).toHaveLength(0);
      frames = reader.read(new Uint8Array(FRAME.slice(start, cut)));
      start = cut;
    }

    expect(frames).toHaveLength(1);
    expect(frames[0].voltage).toBeCloseTo(13.289, 3);
  });

  it("skips the AT keepalives the BMS interleaves between frames", () => {
    const reader = new JkBmsFrameReader();

    expect(reader.read(new Uint8Array(AT_KEEPALIVE))).toHaveLength(0);
    const first = reader.read(new Uint8Array(FRAME));
    expect(reader.read(new Uint8Array(AT_KEEPALIVE))).toHaveLength(0);
    const second = reader.read(new Uint8Array(FRAME));

    expect(first).toHaveLength(1);
    expect(second).toHaveLength(1);
  });

  it("skips a keepalive glued to the front of a fragment", () => {
    const reader = new JkBmsFrameReader();

    reader.read(new Uint8Array([...AT_KEEPALIVE, ...FRAME.slice(0, 128)]));
    const frames = reader.read(new Uint8Array(FRAME.slice(128)));

    expect(frames).toHaveLength(1);
  });

  it("assembles a frame split inside its header", () => {
    const reader = new JkBmsFrameReader();

    expect(reader.read(new Uint8Array(FRAME.slice(0, 2)))).toHaveLength(0);
    const frames = reader.read(new Uint8Array(FRAME.slice(2)));

    expect(frames).toHaveLength(1);
  });

  it("reads both frames when a chunk carries two", () => {
    const reader = new JkBmsFrameReader();

    const frames = reader.read(new Uint8Array([...FRAME, ...FRAME]));

    expect(frames).toHaveLength(2);
  });

  it("drops a frame with a bad checksum and recovers on the next one", () => {
    const reader = new JkBmsFrameReader();

    const frames = reader.read(
      new Uint8Array([...withBrokenChecksum(FRAME), ...FRAME]),
    );

    expect(frames).toHaveLength(1);
    expect(frames[0].soc).toBe(85);
  });

  it("consumes a record it does not parse without emitting it", () => {
    const reader = new JkBmsFrameReader();

    const frames = reader.read(new Uint8Array([...SETTINGS_FRAME, ...FRAME]));

    expect(frames).toHaveLength(1);
    expect(frames[0].soc).toBe(85);
  });

  it("still reads a frame after a flood of bytes that never completes one", () => {
    const reader = new JkBmsFrameReader();
    const flood = new Uint8Array(50_000);

    reader.read(flood);
    const frames = reader.read(new Uint8Array(FRAME));

    expect(frames).toHaveLength(1);
  });

  it("drops the pending bytes once reset", () => {
    const reader = new JkBmsFrameReader();
    reader.read(new Uint8Array(FRAME.slice(0, 150)));

    reader.reset();

    expect(reader.read(new Uint8Array(FRAME.slice(150)))).toHaveLength(0);
  });
});
