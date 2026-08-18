/**
 * JK BMS BLE service and characteristic UUIDs.
 * The BMS advertises the 16-bit service 0xFFE0 and carries its whole data
 * protocol on the single 0xFFE1 characteristic (notify + write); Android
 * reports both in the 128-bit Bluetooth-base form below. The TI
 * f000ffc0-… service seen in GATT dumps is its firmware-update (OAD)
 * channel, not the data protocol.
 */
export const JK_BMS_SERVICE_UUID = "0000ffe0-0000-1000-8000-00805f9b34fb";
export const JK_BMS_CHARACTERISTIC_UUID =
  "0000ffe1-0000-1000-8000-00805f9b34fb";
