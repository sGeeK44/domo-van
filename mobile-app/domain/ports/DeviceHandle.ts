/** An opaque reference to a live connection, not a persisted `DeviceInfo`. */
export type DeviceHandle = {
  readonly id: string;
  readonly name: string;
};
