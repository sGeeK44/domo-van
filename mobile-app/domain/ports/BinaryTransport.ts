import type { Listener, Unsubscribe } from "@/core/observable";

/** A raw byte stream, for devices whose protocol is not line-based ASCII. */
export interface BinaryTransport {
  listen(onBytes: Listener<Uint8Array>): Unsubscribe;
  send(bytes: Uint8Array): Promise<void>;
}
