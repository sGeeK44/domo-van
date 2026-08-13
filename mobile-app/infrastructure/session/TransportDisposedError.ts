/** Raised by a persistent transport used after its owner released it. */
export class TransportDisposedError extends Error {
  constructor() {
    super("This transport has been disposed.");
    this.name = "TransportDisposedError";
  }
}
