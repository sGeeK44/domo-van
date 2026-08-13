import type { Unsubscribe } from "@/core/observable";
import { callAsync } from "@/domain/modules/callAsync";
import type { ModuleDescriptor } from "@/domain/modules/ModuleDescriptor";
import type { LinkState, ModuleSlot } from "@/domain/modules/ModuleSlot";
import { SerialQueue } from "@/domain/modules/SerialQueue";
import { SlotOccupiedError } from "@/domain/modules/SlotOccupiedError";
import type { DeviceConnector } from "@/domain/ports/DeviceConnector";
import type { DeviceHandle } from "@/domain/ports/DeviceHandle";
import type {
  DeviceInfo,
  DeviceRepository,
} from "@/domain/ports/DeviceRepository";
import type { ModuleSessions } from "@/domain/ports/ModuleSessions";

type ConnectOutcome =
  | { kind: "connected"; device: DeviceHandle }
  | { kind: "failed" }
  | { kind: "aborted" };

type ConnectTarget = { deviceId: string; lastContactAt: number | null };

export type ModuleSlotControllerDeps = {
  module: ModuleDescriptor;
  repository: DeviceRepository;
  connector: DeviceConnector;
  sessions: ModuleSessions;
  now: () => number;
  connectTimeoutMs: number;
  onChange: () => void;
};

function offline(lastContactAt: number | null = null): LinkState {
  return { status: "offline", lastContactAt };
}

/** Owns one slot end to end: slot state is written only from a queued step, or from the pre-emptive dispose. */
export class ModuleSlotController {
  readonly module: ModuleDescriptor;
  private readonly repository: DeviceRepository;
  private readonly connector: DeviceConnector;
  private readonly sessions: ModuleSessions;
  private readonly now: () => number;
  private readonly connectTimeoutMs: number;
  private readonly onChange: () => void;
  private readonly queue = new SerialQueue();
  private pairing: DeviceInfo | null = null;
  private link: LinkState = offline();
  private handle: DeviceHandle | null = null;
  private watcher: Unsubscribe | null = null;
  private pendingAbort: (() => void) | null = null;
  private sessionOpen = false;
  private disposed = false;

  constructor(deps: ModuleSlotControllerDeps) {
    this.module = deps.module;
    this.repository = deps.repository;
    this.connector = deps.connector;
    this.sessions = deps.sessions;
    this.now = deps.now;
    this.connectTimeoutMs = deps.connectTimeoutMs;
    this.onChange = deps.onChange;
  }

  snapshot(): ModuleSlot {
    return { module: this.module, pairing: this.pairing, link: this.link };
  }

  restore(pairing: DeviceInfo): Promise<void> {
    return this.queue.run(() => this.restoreNow(pairing));
  }

  claim(pairing: DeviceInfo): Promise<void> {
    return this.queue.run(() => this.claimNow(pairing));
  }

  release(): Promise<void> {
    this.abortPendingConnect();
    return this.queue.run(() => this.releaseNow());
  }

  reconnect(): Promise<void> {
    if (!this.connectTarget()) return Promise.resolve();
    return this.queue.run(() => this.connectNow());
  }

  dispose(): void {
    this.disposed = true;
    this.abortPendingConnect();
    this.detach();
    this.closeSession();
  }

  private async restoreNow(pairing: DeviceInfo): Promise<void> {
    if (this.disposed || this.pairing) return;

    this.occupy(pairing);
    this.openSession(pairing);
    await this.connectNow();
  }

  private async claimNow(pairing: DeviceInfo): Promise<void> {
    if (this.disposed) return;
    if (this.pairing) throw new SlotOccupiedError(this.module.key);

    this.occupy(pairing);
    try {
      await this.repository.setLastDevice(pairing, this.module.key);
    } catch (error) {
      this.free();
      throw error;
    }

    this.openSession(pairing);
    await this.connectNow();
  }

  private async releaseNow(): Promise<void> {
    if (!this.pairing) return;

    const handle = this.handle;
    this.detach();
    this.free();
    this.sessions.unbind(this.module);
    this.closeSession();

    // a radio disconnect that hangs must not stall the slot behind it
    if (handle) void this.releaseHandle(handle);

    await this.repository.clearLastDevice(this.module.key);
  }

  private async connectNow(): Promise<void> {
    const target = this.connectTarget();
    if (!target) return;

    this.setLink({ status: "connecting" });
    const outcome = await this.awaitConnect(target.deviceId);

    // an abort means whoever aborted us already owns the slot state
    if (outcome.kind === "aborted") return;
    if (outcome.kind === "failed") {
      this.setLink(offline(target.lastContactAt));
      return;
    }
    this.attach(outcome.device, target.lastContactAt);
  }

  private connectTarget(): ConnectTarget | null {
    const link = this.link;
    if (this.disposed || !this.pairing || link.status !== "offline")
      return null;
    return { deviceId: this.pairing.id, lastContactAt: link.lastContactAt };
  }

  private awaitConnect(deviceId: string): Promise<ConnectOutcome> {
    const connecting = callAsync(() => this.connector.connect(deviceId));

    return new Promise<ConnectOutcome>((resolve) => {
      let pending = true;
      const settle = (outcome: ConnectOutcome) => {
        pending = false;
        clearTimeout(timer);
        this.pendingAbort = null;
        resolve(outcome);
      };
      const timer = setTimeout(
        () => settle({ kind: "failed" }),
        this.connectTimeoutMs,
      );
      this.pendingAbort = () => settle({ kind: "aborted" });

      connecting.then(
        (device) => {
          if (pending) settle({ kind: "connected", device });
          else void this.releaseHandle(device);
        },
        () => {
          if (pending) settle({ kind: "failed" });
        },
      );
    });
  }

  private abortPendingConnect(): void {
    this.pendingAbort?.();
  }

  private attach(device: DeviceHandle, lastContactAt: number | null): void {
    this.handle = device;
    if (!this.bindSession(device)) {
      this.failAttach(device, lastContactAt);
      return;
    }

    this.setLink({ status: "online", since: this.now() });
    this.watch(device);
  }

  private bindSession(device: DeviceHandle): boolean {
    try {
      this.sessions.bind(this.module, device);
      return true;
    } catch {
      return false;
    }
  }

  /** A device that cannot carry a session is as good as never connected, and stays reconnectable. */
  private failAttach(device: DeviceHandle, lastContactAt: number | null): void {
    this.detach();
    this.sessions.unbind(this.module);
    this.setLink(offline(lastContactAt));
    void this.releaseHandle(device);
  }

  private watch(device: DeviceHandle): void {
    const stop = this.connector.onDisconnected(device, () =>
      this.dropLink(device),
    );
    // a dispose landing during registration leaves nothing to watch
    if (this.handle === device) this.watcher = stop;
    else stop();
  }

  private dropLink(device: DeviceHandle): void {
    void this.queue.run(async () => this.dropLinkNow(device));
  }

  private dropLinkNow(device: DeviceHandle): void {
    if (this.handle !== device) return;

    this.detach();
    this.sessions.unbind(this.module);
    this.setLink(offline(this.now()));
  }

  private detach(): void {
    this.watcher?.();
    this.watcher = null;
    this.handle = null;
  }

  private async releaseHandle(device: DeviceHandle): Promise<void> {
    // a handle is device-id-keyed, so releasing it would tear down the live link
    if (this.handle?.id === device.id) return;
    try {
      await this.connector.disconnect(device);
    } catch {
      // the radio link may already be down
    }
  }

  private openSession(pairing: DeviceInfo): void {
    if (this.disposed || this.sessionOpen) return;
    this.sessions.open(this.module, pairing);
    this.sessionOpen = true;
  }

  private closeSession(): void {
    if (!this.sessionOpen) return;
    this.sessions.close(this.module);
    this.sessionOpen = false;
  }

  private occupy(pairing: DeviceInfo): void {
    this.pairing = pairing;
    this.link = offline();
    this.onChange();
  }

  private free(): void {
    this.pairing = null;
    this.link = offline();
    this.onChange();
  }

  private setLink(link: LinkState): void {
    this.link = link;
    this.onChange();
  }
}
