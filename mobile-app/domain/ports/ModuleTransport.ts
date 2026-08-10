import type { Channel } from "@/domain/ports/Channel";

/**
 * Opens the channels of a single module. The channel ids are firmware
 * knowledge and stay with the module that owns them, so a transport can never
 * be talked into opening another module's channel.
 */
export interface ModuleTransport {
  openChannel(channelId: string): Channel;
}
