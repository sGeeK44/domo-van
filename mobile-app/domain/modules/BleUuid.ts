export const BLE_UUID_ROOT = "b1f8707e";

export function buildServiceUuid(serviceId: string): string {
  return `${BLE_UUID_ROOT}-${serviceId}-0000-0000-000000000000`;
}

export function buildTxUuid(serviceId: string, channelId: string): string {
  return `${BLE_UUID_ROOT}-${serviceId}-${channelId}-0000-000000000000`;
}

export function buildRxUuid(serviceId: string, channelId: string): string {
  return `${BLE_UUID_ROOT}-${serviceId}-${channelId}-0000-000000000001`;
}
