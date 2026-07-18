/**
 * Identifies which underlying provider a Channel instance talks to.
 * Mirrors `whatsapp_connections.connection_type` in the database.
 */
export type ChannelType = "unofficial_baileys" | "official_cloud_api";

/**
 * Mirrors `whatsapp_connections.status` in the database.
 * `pending_qr` and `logged_out` are Baileys-specific realities that the
 * official Cloud API adapter will simply never emit.
 */
export type ConnectionStatus =
  | "pending_qr"
  | "connecting"
  | "connected"
  | "disconnected"
  | "logged_out";

export interface QrCode {
  /** Raw QR payload (or data URI) to render in the dashboard for scanning. */
  data: string;
  expiresAt: Date;
}

export type MessageContent =
  | { type: "text"; text: string }
  | { type: "image"; url: string; caption?: string }
  | { type: "video"; url: string; caption?: string }
  | { type: "audio"; url: string }
  | { type: "document"; url: string; filename: string; caption?: string };

export interface InboundMessage {
  tenantId: string;
  channelType: ChannelType;
  /** Provider-specific message id, e.g. Baileys key.id or Cloud API message id. */
  externalMessageId: string;
  /** Customer identifier as seen by the provider (phone number / JID). */
  from: string;
  /** The tenant's connected WhatsApp number. */
  to: string;
  content: MessageContent;
  timestamp: Date;
}

export interface OutboundMessage {
  to: string;
  content: MessageContent;
}

export interface SendMessageResult {
  externalMessageId: string;
  sentAt: Date;
}

export interface ConnectionStatusEvent {
  tenantId: string;
  status: ConnectionStatus;
  qr?: QrCode;
  /** Human-readable context, e.g. why a session was logged out. */
  reason?: string;
}

export type MessageHandler = (message: InboundMessage) => void | Promise<void>;

export type ConnectionStatusHandler = (
  event: ConnectionStatusEvent,
) => void | Promise<void>;
