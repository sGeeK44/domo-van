/** The keepalive the BMS interleaves between its frames: "AT\r\n". */
export const AT_KEEPALIVE = [0x41, 0x54, 0x0d, 0x0a];

/** Raw field values of a cell-info frame, in the units the wire carries. */
type CellInfoFields = {
  recordType: number;
  cellVoltagesMv: number[];
  batteryVoltageMv: number;
  powerMw: number;
  currentMa: number;
  soc: number;
  remainingMah: number;
  nominalMah: number;
  cycleCount: number;
  mosTempDeciC: number;
  tempSensor1DeciC: number;
  tempSensor2DeciC: number;
  alarms: number;
  balanceCurrentMa: number;
  balancingAction: number;
  chargeMosfetOn: number;
  dischargeMosfetOn: number;
};

/** Values read off the physical BMS: P ≈ V × I and remaining/nominal ≈ SOC. */
const REAL_DEVICE: CellInfoFields = {
  recordType: 0x02,
  cellVoltagesMv: [3322, 3322, 3322, 3322],
  batteryVoltageMv: 13289,
  powerMw: 81557,
  currentMa: -6137,
  soc: 85,
  remainingMah: 475055,
  nominalMah: 560000,
  cycleCount: 12,
  mosTempDeciC: 231,
  tempSensor1DeciC: 205,
  tempSensor2DeciC: 208,
  alarms: 0,
  balanceCurrentMa: 0,
  balancingAction: 0,
  chargeMosfetOn: 1,
  dischargeMosfetOn: 1,
};

const FRAME_SIZE = 300;

/** Builds a 300-byte JK02 frame at the JK02_32S offsets, checksum included. */
export function cellInfoFrame(
  overrides: Partial<CellInfoFields> = {},
): number[] {
  const fields = { ...REAL_DEVICE, ...overrides };
  const bytes = new Uint8Array(FRAME_SIZE);
  const view = new DataView(bytes.buffer);

  bytes.set([0x55, 0xaa, 0xeb, 0x90]);
  bytes[4] = fields.recordType;

  fields.cellVoltagesMv.forEach((milliVolts, i) => {
    view.setUint16(6 + 2 * i, milliVolts, true);
  });
  view.setUint32(70, (1 << fields.cellVoltagesMv.length) - 1, true);
  view.setInt16(144, fields.mosTempDeciC, true);
  view.setUint32(150, fields.batteryVoltageMv, true);
  view.setUint32(154, fields.powerMw, true);
  view.setInt32(158, fields.currentMa, true);
  view.setInt16(162, fields.tempSensor1DeciC, true);
  view.setInt16(164, fields.tempSensor2DeciC, true);
  view.setUint32(166, fields.alarms, true);
  view.setInt16(170, fields.balanceCurrentMa, true);
  bytes[172] = fields.balancingAction;
  bytes[173] = fields.soc;
  view.setUint32(174, fields.remainingMah, true);
  view.setUint32(178, fields.nominalMah, true);
  view.setUint32(182, fields.cycleCount, true);
  bytes[198] = fields.chargeMosfetOn;
  bytes[199] = fields.dischargeMosfetOn;

  bytes[FRAME_SIZE - 1] = [...bytes.subarray(0, FRAME_SIZE - 1)].reduce(
    (sum, byte) => sum + byte,
    0,
  );
  return [...bytes];
}

/** The physical BMS's broadcast, as captured field by field. */
export const FRAME = cellInfoFrame();

/** A settings broadcast: same envelope, a record type the app does not consume. */
export const SETTINGS_FRAME = cellInfoFrame({ recordType: 0x01 });

export function withBrokenChecksum(source: number[]): number[] {
  const corrupted = [...source];
  corrupted[corrupted.length - 1] ^= 0xff;
  return corrupted;
}
