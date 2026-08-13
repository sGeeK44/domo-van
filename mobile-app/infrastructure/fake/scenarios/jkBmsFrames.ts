// Provenance: no capture from the van's BMS was available, so these are the frames
// the unit tests synthesise, promoted to literals a real capture can replace.

/** Read-all reply of a 4-cell pack: 3.300/3.301/3.299/3.302 V, 13.20 V, +5.00 A, 98 %. */
const NOMINAL_HEX = `
  4e57 002e 00000000 06 00 00
  79 0c 01 0ce4 02 0ce5 03 0ce3 04 0ce6
  80 0068
  83 0528
  84 01f4
  85 62
  8a 0004
  00000001 68 00000a19
`;

/** The same reply cut mid-payload: the notification that never got its tail. */
const TRUNCATED_HEX = `
  4e57 002e 00000000 06 00 00
  79 0c 01 0ce4 02 0c
`;

/** The same reply with the last checksum byte flipped. */
const BAD_CHECKSUM_HEX = `
  4e57 002e 00000000 06 00 00
  79 0c 01 0ce4 02 0ce5 03 0ce3 04 0ce6
  80 0068
  83 0528
  84 01f4
  85 62
  8a 0004
  00000001 68 00000ae6
`;

function fromHex(hex: string): Uint8Array {
  const digits = hex.replace(/\s+/g, "");
  const bytes = new Uint8Array(digits.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = Number.parseInt(digits.substring(i * 2, i * 2 + 2), 16);
  }
  return bytes;
}

export const JK_BMS_NOMINAL_FRAME = fromHex(NOMINAL_HEX);
export const JK_BMS_TRUNCATED_FRAME = fromHex(TRUNCATED_HEX);
export const JK_BMS_BAD_CHECKSUM_FRAME = fromHex(BAD_CHECKSUM_HEX);

/** The rejected frames come first, so a replay leaves the reader on good data. */
export const JK_BMS_CORPUS: readonly Uint8Array[] = [
  JK_BMS_TRUNCATED_FRAME,
  JK_BMS_BAD_CHECKSUM_FRAME,
  JK_BMS_NOMINAL_FRAME,
];
