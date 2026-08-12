import { describe, expect, it } from "vitest";
import { JkBmsFrameReader } from "@/domain/battery/JkBmsFrameReader";
import { parseResponse } from "@/domain/battery/JkBmsProtocol";
import {
  CELL_VOLTAGES,
  FRAME,
  frame,
  PAYLOAD,
  STATE_OF_CHARGE,
  withBogusLength,
  withBrokenChecksum,
} from "./JkBmsFrames";

describe("parseResponse", () => {
  it("reads the telemetry of a recorded frame", () => {
    const data = parseResponse(new Uint8Array(FRAME));

    expect(data).not.toBeNull();
    expect(data?.cellVoltages).toHaveLength(4);
    expect(data?.cellVoltages?.[0]).toBeCloseTo(3.3, 3);
    expect(data?.cellVoltages?.[1]).toBeCloseTo(3.301, 3);
    expect(data?.cellVoltages?.[2]).toBeCloseTo(3.299, 3);
    expect(data?.cellVoltages?.[3]).toBeCloseTo(3.302, 3);
    expect(data?.cellCount).toBe(4);
    expect(data?.totalVoltage).toBeCloseTo(13.2, 2);
    expect(data?.current).toBeCloseTo(5, 2);
    expect(data?.soc).toBe(98);
  });

  it("reads a payload that contains the frame end marker", () => {
    const data = parseResponse(new Uint8Array(FRAME));

    expect(PAYLOAD).toContain(0x68);
    expect(data?.tempMos).toBe(4);
    expect(data?.soc).toBe(98);
  });

  it("rejects a frame whose checksum does not match", () => {
    const data = parseResponse(new Uint8Array(withBrokenChecksum(FRAME)));

    expect(data).toBeNull();
  });

  it("rejects a truncated frame rather than decoding the missing bytes as zeroes", () => {
    const truncated = frame(PAYLOAD.slice(0, -1));

    const data = parseResponse(new Uint8Array(truncated));

    expect(data).toBeNull();
  });

  it("rejects a cell voltage block that disagrees with the cell count field", () => {
    const threeCells = [0x8a, 0x00, 0x03];

    const data = parseResponse(
      new Uint8Array(frame([...CELL_VOLTAGES, ...threeCells])),
    );

    expect(data).toBeNull();
  });

  it("rejects a cell count field that disagrees with a later cell voltage block", () => {
    const threeCells = [0x8a, 0x00, 0x03];

    const data = parseResponse(
      new Uint8Array(frame([...threeCells, ...CELL_VOLTAGES])),
    );

    expect(data).toBeNull();
  });

  it("rejects a cell voltage block that reports the same cell twice", () => {
    const duplicated = [...CELL_VOLTAGES];
    duplicated[8] = 0x01;

    const data = parseResponse(new Uint8Array(frame(duplicated)));

    expect(data).toBeNull();
  });

  it("only reports the fields the frame carries", () => {
    const data = parseResponse(new Uint8Array(frame([...STATE_OF_CHARGE])));

    expect(data).toEqual({ soc: 98 });
  });
});

describe("JkBmsFrameReader", () => {
  it("reads a frame delivered in one chunk", () => {
    const reader = new JkBmsFrameReader();

    const frames = reader.read(new Uint8Array(FRAME));

    expect(frames).toHaveLength(1);
    expect(frames[0].soc).toBe(98);
  });

  it("waits for the rest of a frame split across notifications", () => {
    const reader = new JkBmsFrameReader();
    const cut = 15;

    expect(reader.read(new Uint8Array(FRAME.slice(0, cut)))).toHaveLength(0);
    const frames = reader.read(new Uint8Array(FRAME.slice(cut)));

    expect(frames).toHaveLength(1);
    expect(frames[0].cellCount).toBe(4);
  });

  it("assembles a frame split between its two start bytes", () => {
    const reader = new JkBmsFrameReader();

    expect(reader.read(new Uint8Array(FRAME.slice(0, 1)))).toHaveLength(0);
    const frames = reader.read(new Uint8Array(FRAME.slice(1)));

    expect(frames).toHaveLength(1);
    expect(frames[0].soc).toBe(98);
  });

  it("reads both frames when a chunk carries two", () => {
    const reader = new JkBmsFrameReader();

    const frames = reader.read(new Uint8Array([...FRAME, ...FRAME]));

    expect(frames).toHaveLength(2);
  });

  it("resynchronises on the start bytes after leading garbage", () => {
    const reader = new JkBmsFrameReader();

    const frames = reader.read(new Uint8Array([0xaa, 0xbb, 0xcc, ...FRAME]));

    expect(frames).toHaveLength(1);
    expect(frames[0].soc).toBe(98);
  });

  it("resynchronises on the next start marker after a bogus length field", () => {
    const reader = new JkBmsFrameReader();

    const frames = reader.read(
      new Uint8Array([...withBogusLength(FRAME), ...FRAME]),
    );

    expect(frames).toHaveLength(1);
    expect(frames[0].soc).toBe(98);
  });

  it("resynchronises on the next start marker after a bad checksum", () => {
    const reader = new JkBmsFrameReader();

    const frames = reader.read(
      new Uint8Array([...withBrokenChecksum(FRAME), ...FRAME]),
    );

    expect(frames).toHaveLength(1);
    expect(frames[0].soc).toBe(98);
  });

  it("drops a truncated frame without emitting it", () => {
    const reader = new JkBmsFrameReader();

    const frames = reader.read(new Uint8Array(frame(PAYLOAD.slice(0, -1))));

    expect(frames).toHaveLength(0);
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
    reader.read(new Uint8Array(FRAME.slice(0, 15)));

    reader.reset();

    expect(reader.read(new Uint8Array(FRAME.slice(15)))).toHaveLength(0);
  });
});
