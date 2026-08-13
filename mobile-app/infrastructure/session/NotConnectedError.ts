/** Raised by a persistent transport asked to write while no session is bound. */
export class NotConnectedError extends Error {
  constructor() {
    super("No BLE session is bound to this transport.");
    this.name = "NotConnectedError";
  }
}
