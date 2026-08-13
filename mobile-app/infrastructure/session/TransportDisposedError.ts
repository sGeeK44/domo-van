/** Unlike NotConnectedError, no session will ever come back: a retry is pointless. */
export class TransportDisposedError extends Error {
  constructor() {
    super("This transport has been disposed.");
    this.name = "TransportDisposedError";
  }
}
