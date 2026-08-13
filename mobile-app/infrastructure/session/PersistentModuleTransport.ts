import { createFanout } from "@/core/fanout";
import type { Listener, Unsubscribe } from "@/core/observable";
import type { Channel } from "@/domain/ports/Channel";
import type { DeviceHandle } from "@/domain/ports/DeviceHandle";
import type { ModuleTransport } from "@/domain/ports/ModuleTransport";
import { NotConnectedError } from "@/infrastructure/session/NotConnectedError";

/** Opens the transport of one module on a freshly connected device. */
export type ModuleSessionFactory = (device: DeviceHandle) => ModuleTransport;

class PersistentChannel implements Channel {
  private readonly frames = createFanout<string>(() => ({ remove: () => {} }));
  private live: { channel: Channel; stop: Unsubscribe } | null = null;

  listen(listener: Listener<string>): Unsubscribe {
    return this.frames.add(listener);
  }

  send(command: string): Promise<void> {
    if (!this.live) return Promise.reject(new NotConnectedError());
    return this.live.channel.send(command);
  }

  bind(channel: Channel): void {
    this.unbind();
    this.live = {
      channel,
      stop: channel.listen((frame) => this.frames.emit(frame)),
    };
  }

  unbind(): void {
    this.live?.stop();
    this.live = null;
  }
}

/** A module transport that outlives its BLE sessions, so a system spans the pairing. */
export class PersistentModuleTransport implements ModuleTransport {
  private readonly channels = new Map<string, PersistentChannel>();
  private session: ModuleTransport | null = null;

  constructor(private readonly openSession: ModuleSessionFactory) {}

  openChannel(channelId: string): Channel {
    const known = this.channels.get(channelId);
    if (known) return known;

    const channel = new PersistentChannel();
    this.channels.set(channelId, channel);
    if (this.session) channel.bind(this.session.openChannel(channelId));
    return channel;
  }

  bind(device: DeviceHandle): void {
    this.unbind();
    const session = this.openSession(device);
    this.session = session;
    for (const [channelId, channel] of this.channels) {
      channel.bind(session.openChannel(channelId));
    }
  }

  /** Keeps the proxies and their listeners: the domain's last values are the point. */
  unbind(): void {
    for (const channel of this.channels.values()) {
      channel.unbind();
    }
    this.session = null;
  }
}
