import { createDetachedFanout } from "@/core/fanout";
import type { Listener, Unsubscribe } from "@/core/observable";
import type { BinaryTransport } from "@/domain/ports/BinaryTransport";
import type { DeviceHandle } from "@/domain/ports/DeviceHandle";
import { NotConnectedError } from "@/infrastructure/session/NotConnectedError";
import { TransportDisposedError } from "@/infrastructure/session/TransportDisposedError";

/** Opens the byte stream of one module on a freshly connected device. */
export type BinarySessionFactory = (device: DeviceHandle) => BinaryTransport;

type Pipe = { transport: BinaryTransport; stop: Unsubscribe };

/** A byte stream that outlives its BLE sessions, so a system spans the pairing. */
export class PersistentBinaryTransport implements BinaryTransport {
  private readonly notifications = createDetachedFanout<Uint8Array>();
  private live: Pipe | null = null;
  private disposed = false;

  constructor(private readonly openSession: BinarySessionFactory) {}

  listen(onBytes: Listener<Uint8Array>): Unsubscribe {
    this.refuseWhenDisposed();
    return this.notifications.add(onBytes);
  }

  send(bytes: Uint8Array): Promise<void> {
    if (!this.live) return Promise.reject(new NotConnectedError());
    return this.live.transport.send(bytes);
  }

  /** All-or-nothing: a stream that failed to subscribe would leave the domain deaf. */
  bind(device: DeviceHandle): void {
    this.refuseWhenDisposed();
    const pipe = this.pipeFrom(this.openSession(device));

    this.unbind();
    this.live = pipe;
  }

  /** Keeps the listeners: the domain's last snapshot is the point. */
  unbind(): void {
    this.live?.stop();
    this.live = null;
  }

  dispose(): void {
    this.unbind();
    this.disposed = true;
  }

  private pipeFrom(transport: BinaryTransport): Pipe {
    return {
      transport,
      stop: transport.listen((chunk) => this.notifications.emit(chunk)),
    };
  }

  private refuseWhenDisposed(): void {
    if (this.disposed) throw new TransportDisposedError();
  }
}
