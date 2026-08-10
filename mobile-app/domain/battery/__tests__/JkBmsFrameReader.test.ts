import { describe, expect, it } from "vitest";
import { JkBmsFrameReader } from "@/domain/battery/JkBmsFrameReader";
import { parseResponse } from "@/domain/battery/JkBmsProtocol";

// Field 0x79: a length byte, then (1-based index, mV big-endian) per cell.
// Cells 1..4 at 3300, 3301, 3299 and 3302 mV.
const CELL_VOLTAGES = [
  0x79, 0x0c, 0x01, 0x0c, 0xe4, 0x02, 0x0c, 0xe5, 0x03, 0x0c, 0xe3, 0x04, 0x0c,
  0xe6,
];
// Field 0x83: pack voltage, 1320 × 10 mV = 13.20 V.
const PACK_VOLTAGE = [0x83, 0x05, 0x28];
// Field 0x84: current, +500 × 10 mA = 5.00 A charging.
const CURRENT = [0x84, 0x01, 0xf4];
// Field 0x85: state of charge, 98 %.
const STATE_OF_CHARGE = [0x85, 0x62];
// Field 0x8a: cell count, 4.
const CELL_COUNT = [0x8a, 0x00, 0x04];

/**
 * A "Read All Data" response from a 4-cell pack, as the BMS puts it on the
 * wire. No payload byte may be 0x68 — that is the frame end marker, and the
 * parser looks for the first one after the 11-byte header.
 */
const PAYLOAD = [
  ...CELL_VOLTAGES,
  ...PACK_VOLTAGE,
  ...CURRENT,
  ...STATE_OF_CHARGE,
  ...CELL_COUNT,
];

// start bytes "NW" · length (filled in below) · terminal id · read-all
// command · source BMS · transport type
const HEADER = [
  0x4e, 0x57, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x06, 0x00, 0x00,
];
// record number · end byte
const TRAILER = [0x00, 0x00, 0x00, 0x01, 0x68];

/** Wraps a payload in the JKSERIAL v2.5 envelope. */
function frame(payload: number[]): number[] {
  const withoutCrc = [...HEADER, ...payload, ...TRAILER];
  const length = withoutCrc.length - 2 + 4; // drop start bytes, add the CRC
  withoutCrc[2] = (length >> 8) & 0xff;
  withoutCrc[3] = length & 0xff;

  const crc = withoutCrc.reduce((sum, byte) => sum + byte, 0);
  return [
    ...withoutCrc,
    (crc >> 24) & 0xff,
    (crc >> 16) & 0xff,
    (crc >> 8) & 0xff,
    crc & 0xff,
  ];
}

const FRAME = frame(PAYLOAD);

describe("parseResponse", () => {
  it("reads the telemetry of a recorded frame", () => {
    const data = parseResponse(new Uint8Array(FRAME));

    expect(data).not.toBeNull();
    expect(data?.cellVoltages).toHaveLength(4);
    expect(data?.cellVoltages[0]).toBeCloseTo(3.3, 3);
    expect(data?.cellVoltages[1]).toBeCloseTo(3.301, 3);
    expect(data?.cellVoltages[2]).toBeCloseTo(3.299, 3);
    expect(data?.cellVoltages[3]).toBeCloseTo(3.302, 3);
    expect(data?.cellCount).toBe(4);
    expect(data?.totalVoltage).toBeCloseTo(13.2, 2);
    expect(data?.current).toBeCloseTo(5, 2);
    expect(data?.soc).toBe(98);
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

  it("drops the pending bytes once reset", () => {
    const reader = new JkBmsFrameReader();
    reader.read(new Uint8Array(FRAME.slice(0, 15)));

    reader.reset();

    expect(reader.read(new Uint8Array(FRAME.slice(15)))).toHaveLength(0);
  });
});
