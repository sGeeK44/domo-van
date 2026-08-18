// Provenance: no capture from the van's BMS was available, so this is a frame
// the unit tests' builder synthesises, promoted to a literal a real capture can
// replace.

/**
 * JK02 cell-info broadcast of a 4-cell pack: 3.300/3.301/3.299/3.302 V,
 * 13.20 V, +5.00 A, 98 %, 98/100 Ah.
 */
const NOMINAL_HEX = `
  55aaeb900200e40ce50ce30ce60c000000000000
  0000000000000000000000000000000000000000
  0000000000000000000000000000000000000000
  000000000000000000000f000000000000000000
  0000000000000000000000000000000000000000
  0000000000000000000000000000000000000000
  0000000000000000000000000000000000000000
  00000000e7000000000090330000d00101008813
  0000cd00d0000000000000000062d07e0100a086
  01000c0000000000000000000000000000000101
  0000000000000000000000000000000000000000
  0000000000000000000000000000000000000000
  0000000000000000000000000000000000000000
  0000000000000000000000000000000000000000
  00000000000000000000000000000000000000e7
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

/** The same broadcast cut mid-frame: the notification that never got its tail. */
export const JK_BMS_TRUNCATED_FRAME = JK_BMS_NOMINAL_FRAME.slice(0, 150);

/** The same broadcast with its checksum byte inverted. */
export const JK_BMS_BAD_CHECKSUM_FRAME = (() => {
  const corrupted = JK_BMS_NOMINAL_FRAME.slice();
  corrupted[corrupted.length - 1] ^= 0xff;
  return corrupted;
})();

/** The rejected frames come first, so a replay leaves the reader on good data. */
export const JK_BMS_CORPUS: readonly Uint8Array[] = [
  JK_BMS_TRUNCATED_FRAME,
  JK_BMS_BAD_CHECKSUM_FRAME,
  JK_BMS_NOMINAL_FRAME,
];
