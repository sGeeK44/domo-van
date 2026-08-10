import type { Listener, Unsubscribe } from "@/core/observable";

/** A bidirectional stream of ASCII commands with one module characteristic. */
export interface Channel {
  listen(listener: Listener<string>): Unsubscribe;
  send(command: string): Promise<void>;
}
