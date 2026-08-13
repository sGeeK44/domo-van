import { createDetachedFanout } from "@/core/fanout";
import type { Listener, Unsubscribe } from "@/core/observable";
import type { Channel } from "@/domain/ports/Channel";
import type { DeviceHandle } from "@/domain/ports/DeviceHandle";
import type { ModuleTransport } from "@/domain/ports/ModuleTransport";
import { NotConnectedError } from "@/infrastructure/session/NotConnectedError";
import { TransportDisposedError } from "@/infrastructure/session/TransportDisposedError";

/** Opens the transport of one module on a freshly connected device. */
export type ModuleSessionFactory = (device: DeviceHandle) => ModuleTransport;

type Pipe = { channel: Channel; stop: Unsubscribe };

class PersistentChannel implements Channel {
  private readonly frames = createDetachedFanout<string>();
  private live: Pipe | null = null;
  private disposed = false;

  listen(listener: Listener<string>): Unsubscribe {
    return this.frames.add(listener);
  }

  send(command: string): Promise<void> {
    if (this.disposed) return Promise.reject(new TransportDisposedError());
    if (!this.live) return Promise.reject(new NotConnectedError());
    return this.live.channel.send(command);
  }

  pipeFrom(channel: Channel): Pipe {
    return {
      channel,
      stop: channel.listen((frame) => this.frames.emit(frame)),
    };
  }

  adopt(pipe: Pipe): void {
    this.live = pipe;
  }

  unbind(): void {
    this.live?.stop();
    this.live = null;
  }

  dispose(): void {
    this.unbind();
    this.disposed = true;
  }
}

function inertChannel(): PersistentChannel {
  const channel = new PersistentChannel();
  channel.dispose();
  return channel;
}

/** A module transport that outlives its BLE sessions, so a system spans the pairing. */
export class PersistentModuleTransport implements ModuleTransport {
  private readonly channels = new Map<string, PersistentChannel>();
  private session: ModuleTransport | null = null;
  private disposed = false;

  constructor(private readonly openSession: ModuleSessionFactory) {}

  openChannel(channelId: string): Channel {
    const known = this.channels.get(channelId);
    if (known) return known;
    if (this.disposed) return inertChannel();

    const channel = new PersistentChannel();
    if (this.session) {
      channel.adopt(channel.pipeFrom(this.session.openChannel(channelId)));
    }
    this.channels.set(channelId, channel);
    return channel;
  }

  /** All-or-nothing: a half-piped session would leave channels mute and unretried. */
  bind(device: DeviceHandle): void {
    if (this.disposed) return;
    const session = this.openSession(device);
    const pipes = this.pipeAll(session);

    this.unbind();
    this.session = session;
    for (const [channel, pipe] of pipes) {
      channel.adopt(pipe);
    }
  }

  /** Keeps the proxies and their listeners: the domain's last values are the point. */
  unbind(): void {
    for (const channel of this.channels.values()) {
      channel.unbind();
    }
    this.session = null;
  }

  /** Inert once disposed: no session opens, no listener fires, every write rejects. */
  dispose(): void {
    for (const channel of this.channels.values()) {
      channel.dispose();
    }
    this.channels.clear();
    this.session = null;
    this.disposed = true;
  }

  private pipeAll(session: ModuleTransport): [PersistentChannel, Pipe][] {
    const pipes: [PersistentChannel, Pipe][] = [];
    try {
      for (const [channelId, channel] of this.channels) {
        pipes.push([channel, channel.pipeFrom(session.openChannel(channelId))]);
      }
      return pipes;
    } catch (error) {
      for (const [, pipe] of pipes) {
        pipe.stop();
      }
      throw error;
    }
  }
}
