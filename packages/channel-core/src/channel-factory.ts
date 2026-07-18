import type { Channel } from "./channel.js";
import type { ChannelType } from "./types.js";

export interface ChannelConfig {
  tenantId: string;
  channelType: ChannelType;
  /** Provider-specific config (Baileys session ref, Cloud API token, ...). */
  [key: string]: unknown;
}

/** Implemented by each provider adapter (Baileys, Meta Cloud API, ...). */
export interface ChannelFactory {
  readonly channelType: ChannelType;
  create(config: ChannelConfig): Promise<Channel>;
}
