/**
 * JK BMS Protocol Implementation (JKSERIAL v2.5)
 *
 * Frame structure:
 * | 0x4E 0x57 | Length (2B) | Terminal (4B) | Cmd | Source | Type | Data... | Record (4B) | End | CRC (4B) |
 *
 * Commands:
 * - 0x06: Read All Data
 *
 * Frame source:
 * - 0x00: BMS
 * - 0x01: Bluetooth
 * - 0x02: GPS
 * - 0x03: PC upper machine
 */

// Start bytes for JK BMS protocol
const FRAME_START = [0x4e, 0x57]; // "NW"
const FRAME_END = 0x68;

const START_BYTES_SIZE = 2;
const LENGTH_SIZE = 2;
/** start(2) + length(2) + terminal(4) + cmd(1) + source(1) + type(1) */
const HEADER_SIZE = 11;
const RECORD_NUMBER_SIZE = 4;
const FRAME_END_SIZE = 1;
const CHECKSUM_SIZE = 4;

/** An envelope with an empty data section. */
export const MIN_FRAME_SIZE =
  HEADER_SIZE + RECORD_NUMBER_SIZE + FRAME_END_SIZE + CHECKSUM_SIZE;

// Commands
export const CMD_READ_ALL = 0x06;

// Frame source
const SOURCE_BLUETOOTH = 0x01;

// Transport type
const TRANSPORT_REQUEST = 0x00;

// Data field identifiers in response
const FIELD_CELL_VOLTAGES = 0x79;
const FIELD_MOS_TEMP = 0x80;
const FIELD_TEMP_SENSOR_1 = 0x81;
const FIELD_TEMP_SENSOR_2 = 0x82;
const FIELD_TOTAL_VOLTAGE = 0x83;
const FIELD_CURRENT = 0x84;
const FIELD_SOC = 0x85;
const FIELD_TEMP_SENSOR_COUNT = 0x86;
const FIELD_CYCLE_COUNT = 0x87;
const FIELD_TOTAL_CYCLE_CAPACITY = 0x89;
const FIELD_CELL_COUNT = 0x8a;
const FIELD_BALANCE_CURRENT = 0x8b;
const FIELD_BALANCE_STATE = 0x8c;
const FIELD_BATTERY_ERRORS = 0x8e;
const FIELD_CHARGE_MOSFET = 0x8f;
const FIELD_DISCHARGE_MOSFET = 0x90;
const FIELD_CAPACITY_AH = 0x91;

const TEMPERATURE_OFFSET = 100;
const CELL_ENTRY_SIZE = 3; // 1-based index + 2 bytes of millivolts
const DEFAULT_BALANCE_STATE_BYTES = 2;
const CELLS_PER_BALANCE_STATE_BYTE = 8;

/** Every field is optional: a frame only carries what the BMS chose to send. */
export type JkBmsData = {
  cellVoltages?: number[]; // Volts per cell
  cellCount?: number;
  totalVoltage?: number; // Volts
  current?: number; // Amps (positive = charging, negative = discharging)
  soc?: number; // 0-100%
  tempMos?: number; // Celsius
  tempSensor1?: number; // Celsius
  tempSensor2?: number; // Celsius
  cycleCount?: number;
  capacityAh?: number; // Amp-hours
  balanceCurrent?: number; // Amps
  balanceState?: number; // Bitmask of balancing cells
  isCharging?: boolean;
  isDischarging?: boolean;
  errors?: number; // Error bitmask
};

function additiveChecksum(bytes: ArrayLike<number>): number {
  let sum = 0;
  for (let i = 0; i < bytes.length; i++) {
    sum += bytes[i];
  }
  return sum;
}

function toBigEndian32(value: number): number[] {
  return [
    (value >> 24) & 0xff,
    (value >> 16) & 0xff,
    (value >> 8) & 0xff,
    value & 0xff,
  ];
}

function readBigEndian32(bytes: Uint8Array, offset: number): number {
  return (
    bytes[offset] * 0x1000000 +
    ((bytes[offset + 1] << 16) | (bytes[offset + 2] << 8) | bytes[offset + 3])
  );
}

/**
 * Build a "Read All Data" command frame
 */
export function buildReadAllCommand(): Uint8Array {
  const terminalId = [0x00, 0x00, 0x00, 0x00];
  const recordNumber = [0x00, 0x00, 0x00, 0x00];

  const frameWithoutChecksum = [
    ...FRAME_START,
    0x00,
    0x00, // Length placeholder
    ...terminalId,
    CMD_READ_ALL,
    SOURCE_BLUETOOTH,
    TRANSPORT_REQUEST,
    // No data payload for read command
    ...recordNumber,
    FRAME_END,
  ];

  const length = frameWithoutChecksum.length - START_BYTES_SIZE + CHECKSUM_SIZE;
  frameWithoutChecksum[2] = (length >> 8) & 0xff;
  frameWithoutChecksum[3] = length & 0xff;

  return new Uint8Array([
    ...frameWithoutChecksum,
    ...toBigEndian32(additiveChecksum(frameWithoutChecksum)),
  ]);
}

/**
 * Total size of the frame the buffer announces, or null while the length field
 * has not arrived yet.
 */
export function declaredFrameLength(buffer: Uint8Array): number | null {
  if (buffer.length < START_BYTES_SIZE + LENGTH_SIZE) {
    return null;
  }
  if (buffer[0] !== FRAME_START[0] || buffer[1] !== FRAME_START[1]) {
    return null;
  }
  return ((buffer[2] << 8) | buffer[3]) + START_BYTES_SIZE;
}

/**
 * Parse a response frame from JK BMS
 * Returns null if the frame is incomplete or invalid
 */
export function parseResponse(data: Uint8Array): JkBmsData | null {
  const frameLength = declaredFrameLength(data);
  if (frameLength === null || frameLength < MIN_FRAME_SIZE) {
    return null;
  }
  if (data.length < frameLength) {
    return null;
  }

  const endIndex = frameLength - CHECKSUM_SIZE - FRAME_END_SIZE;
  if (data[endIndex] !== FRAME_END) {
    return null;
  }

  const checksummed = data.subarray(0, frameLength - CHECKSUM_SIZE);
  if (
    additiveChecksum(checksummed) !==
    readBigEndian32(data, frameLength - CHECKSUM_SIZE)
  ) {
    return null;
  }

  return parseDataSection(
    data.subarray(HEADER_SIZE, endIndex - RECORD_NUMBER_SIZE),
  );
}

/** Reads a byte stream forwards, refusing to read past its end. */
class ByteCursor {
  private offset = 0;

  constructor(private readonly bytes: Uint8Array) {}

  get exhausted(): boolean {
    return this.offset >= this.bytes.length;
  }

  get remaining(): number {
    return this.bytes.length - this.offset;
  }

  u8(): number | null {
    if (this.remaining < 1) return null;
    return this.bytes[this.offset++];
  }

  u16(): number | null {
    if (this.remaining < 2) return null;
    const value = (this.bytes[this.offset] << 8) | this.bytes[this.offset + 1];
    this.offset += 2;
    return value;
  }

  u32(): number | null {
    if (this.remaining < 4) return null;
    const value = readBigEndian32(this.bytes, this.offset);
    this.offset += 4;
    return value;
  }

  skip(count: number): boolean {
    if (this.remaining < count) return false;
    this.offset += count;
    return true;
  }
}

function readCellVoltages(cursor: ByteCursor): number[] | null {
  const blockSize = cursor.u8();
  if (blockSize === null || blockSize % CELL_ENTRY_SIZE !== 0) {
    return null;
  }
  if (cursor.remaining < blockSize) {
    return null;
  }

  const cellCount = blockSize / CELL_ENTRY_SIZE;
  const voltages: number[] = [];
  for (let i = 0; i < cellCount; i++) {
    const cellIndex = cursor.u8();
    const milliVolts = cursor.u16();
    if (cellIndex === null || milliVolts === null) return null;
    if (cellIndex < 1 || cellIndex > cellCount) return null;
    if (voltages[cellIndex - 1] !== undefined) return null;
    voltages[cellIndex - 1] = milliVolts / 1000;
  }
  return voltages;
}

function readBalanceState(
  cursor: ByteCursor,
  cellCount: number,
): number | null {
  const byteCount =
    Math.ceil(cellCount / CELLS_PER_BALANCE_STATE_BYTE) ||
    DEFAULT_BALANCE_STATE_BYTES;

  let state = 0;
  for (let i = 0; i < byteCount; i++) {
    const byte = cursor.u8();
    if (byte === null) return null;
    state |= byte << (i * 8);
  }
  return state;
}

function toSignedCurrent(raw: number): number {
  const isNegative = (raw & 0x8000) !== 0;
  const magnitude = raw & 0x7fff;
  return (isNegative ? -magnitude : magnitude) / 100; // 10 mA units
}

function parseDataSection(dataSection: Uint8Array): JkBmsData | null {
  const cursor = new ByteCursor(dataSection);
  const result: JkBmsData = {};

  while (!cursor.exhausted) {
    const fieldId = cursor.u8();
    if (fieldId === null) return null;

    switch (fieldId) {
      case FIELD_CELL_VOLTAGES: {
        const voltages = readCellVoltages(cursor);
        if (voltages === null) return null;
        if (
          result.cellCount !== undefined &&
          result.cellCount !== voltages.length
        ) {
          return null;
        }
        result.cellVoltages = voltages;
        result.cellCount = voltages.length;
        break;
      }

      case FIELD_MOS_TEMP: {
        const raw = cursor.u16();
        if (raw === null) return null;
        result.tempMos = raw - TEMPERATURE_OFFSET;
        break;
      }

      case FIELD_TEMP_SENSOR_1: {
        const raw = cursor.u16();
        if (raw === null) return null;
        result.tempSensor1 = raw - TEMPERATURE_OFFSET;
        break;
      }

      case FIELD_TEMP_SENSOR_2: {
        const raw = cursor.u16();
        if (raw === null) return null;
        result.tempSensor2 = raw - TEMPERATURE_OFFSET;
        break;
      }

      case FIELD_TOTAL_VOLTAGE: {
        const raw = cursor.u16();
        if (raw === null) return null;
        result.totalVoltage = raw / 100; // 10 mV units
        break;
      }

      case FIELD_CURRENT: {
        const raw = cursor.u16();
        if (raw === null) return null;
        result.current = toSignedCurrent(raw);
        break;
      }

      case FIELD_SOC: {
        const raw = cursor.u8();
        if (raw === null) return null;
        result.soc = raw;
        break;
      }

      case FIELD_TEMP_SENSOR_COUNT: {
        if (!cursor.skip(1)) return null;
        break;
      }

      case FIELD_CYCLE_COUNT: {
        const raw = cursor.u16();
        if (raw === null) return null;
        result.cycleCount = raw;
        break;
      }

      case FIELD_TOTAL_CYCLE_CAPACITY: {
        if (!cursor.skip(4)) return null;
        break;
      }

      case FIELD_CELL_COUNT: {
        const raw = cursor.u16();
        if (raw === null) return null;
        if (result.cellVoltages && result.cellVoltages.length !== raw) {
          return null;
        }
        result.cellCount = raw;
        break;
      }

      case FIELD_BALANCE_CURRENT: {
        const raw = cursor.u16();
        if (raw === null) return null;
        result.balanceCurrent = raw / 1000; // mA
        break;
      }

      case FIELD_BALANCE_STATE: {
        const state = readBalanceState(cursor, result.cellCount ?? 0);
        if (state === null) return null;
        result.balanceState = state;
        break;
      }

      case FIELD_BATTERY_ERRORS: {
        const raw = cursor.u16();
        if (raw === null) return null;
        result.errors = raw;
        break;
      }

      case FIELD_CHARGE_MOSFET: {
        const raw = cursor.u8();
        if (raw === null) return null;
        result.isCharging = raw === 1;
        break;
      }

      case FIELD_DISCHARGE_MOSFET: {
        const raw = cursor.u8();
        if (raw === null) return null;
        result.isDischarging = raw === 1;
        break;
      }

      case FIELD_CAPACITY_AH: {
        const raw = cursor.u32();
        if (raw === null) return null;
        result.capacityAh = raw / 1000; // mAh
        break;
      }

      default:
        // An unknown field id has no known width, so the rest is undecodable.
        return result;
    }
  }

  return result;
}

/**
 * Find the start of a valid frame in the buffer (for resynchronization)
 * A trailing lone start byte counts: the rest of the marker may be in the next chunk.
 */
export function findFrameStart(buffer: Uint8Array): number {
  for (let i = 0; i < buffer.length; i++) {
    if (buffer[i] !== FRAME_START[0]) continue;
    if (i + 1 === buffer.length || buffer[i + 1] === FRAME_START[1]) {
      return i;
    }
  }
  return -1;
}
