/**
 * JK BMS "JK02" BLE protocol (JK02_32S layout).
 *
 * Commands (host → BMS), 20 bytes:
 * | 0xAA 0x55 0x90 0xEB | Cmd | 0x00 × 14 | Checksum |
 * The device-info request (0x97) wakes the stream; the cell-info request
 * (0x96) then starts a 1 Hz unsolicited broadcast.
 *
 * Response frames (BMS → host), 300 bytes:
 * | 0x55 0xAA 0xEB 0x90 | Record type | Counter | Payload... | Checksum |
 * Both checksums are the byte sum of everything before them, masked to 8 bits.
 */

const COMMAND_HEADER = [0xaa, 0x55, 0x90, 0xeb];
const COMMAND_SIZE = 20;

const CMD_DEVICE_INFO = 0x97;
const CMD_CELL_INFO = 0x96;

const FRAME_HEADER = [0x55, 0xaa, 0xeb, 0x90];
export const FRAME_SIZE = 300;

const RECORD_TYPE_OFFSET = 4;
const RECORD_CELL_INFO = 0x02;

// Cell info record offsets, from the frame start.
const CELL_VOLTAGES_OFFSET = 6; // uint16 mV per cell slot
const ENABLED_CELLS_OFFSET = 70; // uint32 bitmask, bit i = cell i populated
const MOS_TEMP_OFFSET = 144; // int16, 0.1 °C
const VOLTAGE_OFFSET = 150; // uint32 mV
const POWER_OFFSET = 154; // uint32 mW, unsigned magnitude
const CURRENT_OFFSET = 158; // int32 mA, negative = discharging
const TEMP_SENSOR_1_OFFSET = 162; // int16, 0.1 °C
const TEMP_SENSOR_2_OFFSET = 164; // int16, 0.1 °C
const ALARMS_OFFSET = 166; // uint32 bitmask
const BALANCE_CURRENT_OFFSET = 170; // int16 mA
const BALANCING_OFFSET = 172; // uint8, 0 = off
const SOC_OFFSET = 173; // uint8 %
const REMAINING_CAPACITY_OFFSET = 174; // uint32 mAh
const NOMINAL_CAPACITY_OFFSET = 178; // uint32 mAh
const CYCLE_COUNT_OFFSET = 182; // uint32
const CHARGE_MOSFET_OFFSET = 198; // uint8, 1 = closed
const DISCHARGE_MOSFET_OFFSET = 199; // uint8, 1 = closed

/** One cell-info broadcast; every field is carried by every frame. */
export type JkBmsCellInfo = {
  cellVoltages: number[]; // Volts, index n is physical cell n + 1
  voltage: number; // Volts
  power: number; // Watts, unsigned: the current carries the direction
  current: number; // Amps (positive = charging, negative = discharging)
  soc: number; // 0-100%
  remainingAh: number; // Amp-hours
  nominalAh: number; // Amp-hours
  cycleCount: number;
  tempMos: number; // Celsius
  tempSensor1: number; // Celsius
  tempSensor2: number; // Celsius
  alarms: number; // Alarm bitmask
  balanceCurrent: number; // Amps
  balancing: boolean;
  chargeMosfetOn: boolean;
  dischargeMosfetOn: boolean;
};

function additiveChecksum(bytes: Uint8Array, count: number): number {
  let sum = 0;
  for (let i = 0; i < count; i++) {
    sum += bytes[i];
  }
  return sum & 0xff;
}

function buildCommand(command: number): Uint8Array {
  const frame = new Uint8Array(COMMAND_SIZE);
  frame.set(COMMAND_HEADER);
  frame[4] = command;
  frame[COMMAND_SIZE - 1] = additiveChecksum(frame, COMMAND_SIZE - 1);
  return frame;
}

export function buildDeviceInfoCommand(): Uint8Array {
  return buildCommand(CMD_DEVICE_INFO);
}

export function buildCellInfoCommand(): Uint8Array {
  return buildCommand(CMD_CELL_INFO);
}

/**
 * Find the start of a frame header in the buffer (for resynchronization).
 * A partial match at the buffer's end counts: the rest of the header may be
 * in the next chunk.
 */
export function findFrameHeader(buffer: Uint8Array): number {
  for (let i = 0; i < buffer.length; i++) {
    let matched = true;
    for (let j = 0; j < FRAME_HEADER.length && i + j < buffer.length; j++) {
      if (buffer[i + j] !== FRAME_HEADER[j]) {
        matched = false;
        break;
      }
    }
    if (matched) return i;
  }
  return -1;
}

/** True when the frame's last byte matches the sum of the 299 before it. */
export function isChecksumValid(frame: Uint8Array): boolean {
  return additiveChecksum(frame, FRAME_SIZE - 1) === frame[FRAME_SIZE - 1];
}

/**
 * Parse a checksum-verified 300-byte frame.
 * Returns null for the record types the app does not consume.
 */
export function parseCellInfo(frame: Uint8Array): JkBmsCellInfo | null {
  if (frame[RECORD_TYPE_OFFSET] !== RECORD_CELL_INFO) {
    return null;
  }

  const view = new DataView(frame.buffer, frame.byteOffset, frame.byteLength);
  const enabledCells = view.getUint32(ENABLED_CELLS_OFFSET, true);
  // Unpopulated slots past the highest enabled cell read 0 and are dropped;
  // a 0 V reading below it is a broken sense wire and keeps its place.
  const cellCount = 32 - Math.clz32(enabledCells);
  const cellVoltages: number[] = [];
  for (let i = 0; i < cellCount; i++) {
    cellVoltages.push(
      view.getUint16(CELL_VOLTAGES_OFFSET + 2 * i, true) / 1000,
    );
  }

  return {
    cellVoltages,
    voltage: view.getUint32(VOLTAGE_OFFSET, true) / 1000,
    power: view.getUint32(POWER_OFFSET, true) / 1000,
    current: view.getInt32(CURRENT_OFFSET, true) / 1000,
    soc: frame[SOC_OFFSET],
    remainingAh: view.getUint32(REMAINING_CAPACITY_OFFSET, true) / 1000,
    nominalAh: view.getUint32(NOMINAL_CAPACITY_OFFSET, true) / 1000,
    cycleCount: view.getUint32(CYCLE_COUNT_OFFSET, true),
    tempMos: view.getInt16(MOS_TEMP_OFFSET, true) / 10,
    tempSensor1: view.getInt16(TEMP_SENSOR_1_OFFSET, true) / 10,
    tempSensor2: view.getInt16(TEMP_SENSOR_2_OFFSET, true) / 10,
    alarms: view.getUint32(ALARMS_OFFSET, true),
    balanceCurrent: view.getInt16(BALANCE_CURRENT_OFFSET, true) / 1000,
    balancing: frame[BALANCING_OFFSET] !== 0,
    chargeMosfetOn: frame[CHARGE_MOSFET_OFFSET] !== 0,
    dischargeMosfetOn: frame[DISCHARGE_MOSFET_OFFSET] !== 0,
  };
}
