// Field 0x79: a length byte, then (1-based index, mV big-endian) per cell.
// Cells 1..4 at 3300, 3301, 3299 and 3302 mV.
export const CELL_VOLTAGES = [
  0x79, 0x0c, 0x01, 0x0c, 0xe4, 0x02, 0x0c, 0xe5, 0x03, 0x0c, 0xe3, 0x04, 0x0c,
  0xe6,
];
// Field 0x80: MOS temperature, 104 - 100 = 4 °C. Its low byte is 0x68, the
// frame end marker, which a payload is allowed to contain.
export const MOS_TEMP = [0x80, 0x00, 0x68];
// Field 0x83: pack voltage, 1320 × 10 mV = 13.20 V.
export const PACK_VOLTAGE = [0x83, 0x05, 0x28];
// Field 0x84: current, +500 × 10 mA = 5.00 A charging.
export const CURRENT = [0x84, 0x01, 0xf4];
// Field 0x85: state of charge, 98 %.
export const STATE_OF_CHARGE = [0x85, 0x62];
// Field 0x8a: cell count, 4.
export const CELL_COUNT = [0x8a, 0x00, 0x04];
// Field 0x84: current, 0 × 10 mA, the pack neither charging nor discharging.
export const NO_CURRENT = [0x84, 0x00, 0x00];
// Field 0x8f: charge MOSFET closed.
export const CHARGE_MOSFET_ON = [0x8f, 0x01];
// Field 0x90: discharge MOSFET closed.
export const DISCHARGE_MOSFET_ON = [0x90, 0x01];

/** A "Read All Data" response from a 4-cell pack, as the BMS puts it on the wire. */
export const PAYLOAD = [
  ...CELL_VOLTAGES,
  ...MOS_TEMP,
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

/** Wraps a payload in the JKSERIAL v2.5 envelope, length and checksum included. */
export function frame(payload: number[]): number[] {
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

export const FRAME = frame(PAYLOAD);

export function withBrokenChecksum(source: number[]): number[] {
  const corrupted = [...source];
  corrupted[corrupted.length - 1] ^= 0xff;
  return corrupted;
}

export function withBogusLength(source: number[]): number[] {
  const corrupted = [...source];
  corrupted[2] = 0xff;
  corrupted[3] = 0xff;
  return corrupted;
}
