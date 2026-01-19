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

export type JkBmsData = {
  cellVoltages: number[]; // Volts per cell
  cellCount: number;
  totalVoltage: number; // Volts
  current: number; // Amps (positive = charging, negative = discharging)
  soc: number; // 0-100%
  tempMos: number; // Celsius
  tempSensor1: number; // Celsius
  tempSensor2: number; // Celsius
  cycleCount: number;
  capacityAh: number; // Amp-hours
  balanceCurrent: number; // Amps
  balanceState: number; // Bitmask of balancing cells
  isCharging: boolean;
  isDischarging: boolean;
  errors: number; // Error bitmask
};

/**
 * Build a "Read All Data" command frame
 */
export function buildReadAllCommand(): Uint8Array {
  const terminalId = [0x00, 0x00, 0x00, 0x00];
  const recordNumber = [0x00, 0x00, 0x00, 0x00];

  // Build frame without CRC first
  const frameWithoutCrc = [
    ...FRAME_START,
    0x00,
    0x13, // Length placeholder (will be calculated)
    ...terminalId,
    CMD_READ_ALL,
    SOURCE_BLUETOOTH,
    TRANSPORT_REQUEST,
    // No data payload for read command
    ...recordNumber,
    FRAME_END,
  ];

  // Calculate length (from length field to end, inclusive, excluding CRC)
  const length = frameWithoutCrc.length - 2 + 4; // -2 for start bytes, +4 for CRC
  frameWithoutCrc[2] = (length >> 8) & 0xff;
  frameWithoutCrc[3] = length & 0xff;

  // Calculate CRC (sum of all bytes from start to end)
  let crc = 0;
  for (const byte of frameWithoutCrc) {
    crc += byte;
  }

  // Append CRC (4 bytes, big-endian)
  const frame = [
    ...frameWithoutCrc,
    (crc >> 24) & 0xff,
    (crc >> 16) & 0xff,
    (crc >> 8) & 0xff,
    crc & 0xff,
  ];

  return new Uint8Array(frame);
}

/**
 * Parse a response frame from JK BMS
 * Returns null if the frame is incomplete or invalid
 */
export function parseResponse(data: Uint8Array): JkBmsData | null {
  // Minimum frame size check
  if (data.length < 20) {
    return null;
  }

  // Check start bytes
  if (data[0] !== FRAME_START[0] || data[1] !== FRAME_START[1]) {
    return null;
  }

  // Get length
  const length = (data[2] << 8) | data[3];

  // Check if we have the complete frame
  if (data.length < length + 2) {
    // +2 for start bytes
    return null;
  }

  // Find end byte position
  const endIndex = data.indexOf(FRAME_END, 11); // Start searching after header
  if (endIndex === -1) {
    return null;
  }

  // Extract data section (between header and record number)
  // Header: start(2) + length(2) + terminal(4) + cmd(1) + source(1) + type(1) = 11 bytes
  const dataSection = data.slice(11, endIndex - 4); // -4 for record number

  // Parse the data fields
  const result: JkBmsData = {
    cellVoltages: [],
    cellCount: 0,
    totalVoltage: 0,
    current: 0,
    soc: 0,
    tempMos: 0,
    tempSensor1: 0,
    tempSensor2: 0,
    cycleCount: 0,
    capacityAh: 0,
    balanceCurrent: 0,
    balanceState: 0,
    isCharging: false,
    isDischarging: false,
    errors: 0,
  };

  let offset = 0;
  while (offset < dataSection.length) {
    const fieldId = dataSection[offset];
    offset++;

    switch (fieldId) {
      case FIELD_CELL_VOLTAGES: {
        // Cell voltages: length byte followed by cell data
        const cellDataLength = dataSection[offset];
        offset++;
        const cellCount = Math.floor(cellDataLength / 3); // 3 bytes per cell (index + 2 bytes voltage)
        result.cellVoltages = [];
        for (let i = 0; i < cellCount; i++) {
          const cellIndex = dataSection[offset];
          const voltageRaw =
            (dataSection[offset + 1] << 8) | dataSection[offset + 2];
          const voltage = voltageRaw / 1000; // Convert mV to V
          result.cellVoltages[cellIndex - 1] = voltage; // Cell index is 1-based
          offset += 3;
        }
        result.cellCount = cellCount;
        break;
      }

      case FIELD_MOS_TEMP: {
        // MOS temperature (2 bytes, offset by 100)
        const tempRaw = (dataSection[offset] << 8) | dataSection[offset + 1];
        result.tempMos = tempRaw - 100;
        offset += 2;
        break;
      }

      case FIELD_TEMP_SENSOR_1: {
        // Temperature sensor 1 (2 bytes, offset by 100)
        const tempRaw = (dataSection[offset] << 8) | dataSection[offset + 1];
        result.tempSensor1 = tempRaw - 100;
        offset += 2;
        break;
      }

      case FIELD_TEMP_SENSOR_2: {
        // Temperature sensor 2 (2 bytes, offset by 100)
        const tempRaw = (dataSection[offset] << 8) | dataSection[offset + 1];
        result.tempSensor2 = tempRaw - 100;
        offset += 2;
        break;
      }

      case FIELD_TOTAL_VOLTAGE: {
        // Total voltage (2 bytes, in 10mV units)
        const voltageRaw =
          (dataSection[offset] << 8) | dataSection[offset + 1];
        result.totalVoltage = voltageRaw / 100; // Convert to V
        offset += 2;
        break;
      }

      case FIELD_CURRENT: {
        // Current (2 bytes, signed, in 10mA units)
        let currentRaw = (dataSection[offset] << 8) | dataSection[offset + 1];
        // Handle sign (bit 15 indicates direction)
        const isNegative = (currentRaw & 0x8000) !== 0;
        currentRaw = currentRaw & 0x7fff;
        result.current = (isNegative ? -currentRaw : currentRaw) / 100; // Convert to A
        offset += 2;
        break;
      }

      case FIELD_SOC: {
        // State of charge (1 byte, 0-100%)
        result.soc = dataSection[offset];
        offset++;
        break;
      }

      case FIELD_TEMP_SENSOR_COUNT: {
        // Number of temperature sensors (1 byte)
        offset++;
        break;
      }

      case FIELD_CYCLE_COUNT: {
        // Cycle count (2 bytes)
        result.cycleCount =
          (dataSection[offset] << 8) | dataSection[offset + 1];
        offset += 2;
        break;
      }

      case FIELD_TOTAL_CYCLE_CAPACITY: {
        // Total cycle capacity (4 bytes)
        offset += 4;
        break;
      }

      case FIELD_CELL_COUNT: {
        // Cell count (2 bytes)
        result.cellCount =
          (dataSection[offset] << 8) | dataSection[offset + 1];
        offset += 2;
        break;
      }

      case FIELD_BALANCE_CURRENT: {
        // Balance current (2 bytes, in mA)
        const balanceRaw =
          (dataSection[offset] << 8) | dataSection[offset + 1];
        result.balanceCurrent = balanceRaw / 1000; // Convert to A
        offset += 2;
        break;
      }

      case FIELD_BALANCE_STATE: {
        // Balance state (bitmask for which cells are balancing)
        // Length varies based on cell count, typically 2-4 bytes
        const stateBytes = Math.ceil(result.cellCount / 8) || 2;
        result.balanceState = 0;
        for (let i = 0; i < stateBytes && offset < dataSection.length; i++) {
          result.balanceState |= dataSection[offset] << (i * 8);
          offset++;
        }
        break;
      }

      case FIELD_BATTERY_ERRORS: {
        // Error flags (2 bytes)
        result.errors = (dataSection[offset] << 8) | dataSection[offset + 1];
        offset += 2;
        break;
      }

      case FIELD_CHARGE_MOSFET: {
        // Charge MOSFET state (1 byte)
        result.isCharging = dataSection[offset] === 1;
        offset++;
        break;
      }

      case FIELD_DISCHARGE_MOSFET: {
        // Discharge MOSFET state (1 byte)
        result.isDischarging = dataSection[offset] === 1;
        offset++;
        break;
      }

      case FIELD_CAPACITY_AH: {
        // Nominal capacity (4 bytes, in mAh)
        const capacityRaw =
          (dataSection[offset] << 24) |
          (dataSection[offset + 1] << 16) |
          (dataSection[offset + 2] << 8) |
          dataSection[offset + 3];
        result.capacityAh = capacityRaw / 1000; // Convert to Ah
        offset += 4;
        break;
      }

      default: {
        // Unknown field - try to skip
        // Most fields are 1-4 bytes, skip 1 byte and hope for the best
        offset++;
        break;
      }
    }
  }

  return result;
}

/**
 * Check if we have a complete frame in the buffer
 */
export function hasCompleteFrame(buffer: Uint8Array): boolean {
  if (buffer.length < 20) return false;

  // Check start bytes
  if (buffer[0] !== FRAME_START[0] || buffer[1] !== FRAME_START[1]) {
    return false;
  }

  // Get expected length
  const length = (buffer[2] << 8) | buffer[3];

  // Check if we have the complete frame (+2 for start bytes)
  return buffer.length >= length + 2;
}

/**
 * Find the start of a valid frame in the buffer (for resynchronization)
 */
export function findFrameStart(buffer: Uint8Array): number {
  for (let i = 0; i < buffer.length - 1; i++) {
    if (buffer[i] === FRAME_START[0] && buffer[i + 1] === FRAME_START[1]) {
      return i;
    }
  }
  return -1;
}
