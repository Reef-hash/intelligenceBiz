import type {
  ChannelType,
  ConnectionStatus,
  ConnectionStatusHandler,
  MessageHandler,
  OutboundMessage,
  SendMessageResult,
} from "./types.js";

/**
 * Provider-agnostic contract for a messaging channel (one connected
 * WhatsApp number for one tenant). The core API and ai-engine depend only
 * on this interface, never on a specific provider — swapping the Baileys
 * adapter for the Meta Cloud API adapter later must not require touching
 * anything outside this package's implementations.
 */
export interface Channel {
  readonly tenantId: string;
  readonly channelType: ChannelType;

  sendMessage(message: OutboundMessage): Promise<SendMessageResult>;

  /** Register a handler invoked for every inbound customer message. */
  onMessageReceived(handler: MessageHandler): void;

  getConnectionStatus(): Promise<ConnectionStatus>;

  /**
   * Re-establish the connection after a drop. For Baileys this replays
   * stored auth state; for the Cloud API adapter this is effectively a
   * no-op since the channel is a stateless HTTPS API.
   */
  reconnect(): Promise<void>;

  /**
   * Register a handler for connection lifecycle changes (pending_qr,
   * connected, logged_out, ...). Required so the worker can push QR codes
   * and logout notices to the tenant without the core/ai-engine polling.
   */
  onConnectionStatusChange(handler: ConnectionStatusHandler): void;
}
