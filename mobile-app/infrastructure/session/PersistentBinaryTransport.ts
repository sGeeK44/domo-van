import { createFanout } from "@/core/fanout";
import type { Listener, Unsubscribe } from "@/core/observable";
import type { BinaryTransport } from "@/domain/ports/BinaryTransport";
import type { DeviceHandle } from "@/domain/ports/DeviceHandle";
import { NotConnectedError } from "@/infrastructure/session/NotConnectedError";

/** Opens the byte stream of one module on a freshly connected device. */
export type BinarySessionFactory = (device: DeviceHandle) => BinaryTransport;

/** A byte stream that outlives its BLE sessions, so a system spans the pairing. */
export class PersistentBinaryTransport implements BinaryTransport {
  private readonly notifications = createFanout<Uint8Array>(() => ({
    remove: () => {},
  }));
  private live: { transport: BinaryTransport; stop: Unsubscribe } | null = null;

  constructor(private readonly openSession: BinarySessionFactory) {}

  listen(onBytes: Listener<Uint8Array>): Unsubscribe {
    return this.notifications.add(onBytes);
  }

  send(bytes: Uint8Array): Promise<void> {
    if (!this.live) return Promise.reject(new NotConnectedError());
    return this.live.transport.send(bytes);
  }

  bind(device: DeviceHandle): void {
    this.unbind();
    const transport = this.openSession(device);
    this.live = {
      transport,
      stop: transport.listen((chunk) => this.notifications.emit(chunk)),
    };
  }

  /** Keeps the listeners: the domain's last snapshot is the point. */
  unbind(): void {
    this.live?.stop();
    this.live = null;
  }
}
