import type { Queue, Worker } from "bullmq";
import type { Redis } from "ioredis";
import type { InboundMessage } from "@intelligencebiz/channel-core";
import type { TypedSupabaseClient } from "@intelligencebiz/database";
import { createIncomingQueue, createOutgoingQueue, type OutgoingJobData } from "@intelligencebiz/queue";
import type { Logger } from "@intelligencebiz/shared";
import { BaileysChannel } from "./baileys/baileys-channel.js";
import { ConnectionRepository } from "./db/connection-repository.js";
import { MessageRepository } from "./db/message-repository.js";
import { createOutgoingWorker } from "./queue/outgoing-worker.js";
import { SupabaseSessionStore } from "./session/session-store.js";

export interface SessionManagerConfig {
  supabase: TypedSupabaseClient;
  redisConnection: Redis;
  encryptionKey: string;
  outgoingRateLimit: number;
  outgoingRateWindowMs: number;
  logger: Logger;
}

interface TenantSession {
  channel: BaileysChannel;
  outgoingQueue: Queue<OutgoingJobData>;
  outgoingWorker: Worker<OutgoingJobData>;
}

/**
 * Owns one BaileysChannel + one outgoing BullMQ queue/worker pair per
 * tenant running on this worker process. A fleet of these processes,
 * each started (via startTenant, see index.ts) for a subset of tenants,
 * is how "worker pool" scaling from the architecture doc is realized.
 * apps/api never calls into this class directly — it only produces to
 * and consumes from the same Redis queues (see @intelligencebiz/queue),
 * so which process runs which tenant stays this app's own concern.
 */
export class SessionManager {
  private readonly sessions = new Map<string, TenantSession>();
  private readonly connectionRepository: ConnectionRepository;
  private readonly messageRepository: MessageRepository;
  private readonly incomingQueue: Queue<InboundMessage>;
  private readonly logger: Logger;

  constructor(private readonly config: SessionManagerConfig) {
    this.connectionRepository = new ConnectionRepository(config.supabase);
    this.messageRepository = new MessageRepository(config.supabase);
    this.incomingQueue = createIncomingQueue(config.redisConnection);
    this.logger = config.logger;
  }

  async startTenant(tenantId: string): Promise<void> {
    if (this.sessions.has(tenantId)) return;

    const sessionStore = new SupabaseSessionStore(this.config.supabase);
    const channel = new BaileysChannel({
      tenantId,
      sessionStore,
      encryptionKey: this.config.encryptionKey,
      logger: this.logger,
    });

    channel.onConnectionStatusChange(async (event) => {
      this.logger.info("connection status changed", { ...event });
      try {
        await this.connectionRepository.updateStatus(event);
      } catch (err) {
        this.logger.error("failed to persist connection status", { tenantId, err: String(err) });
      }
    });

    channel.onMessageReceived(async (message) => {
      try {
        await this.messageRepository.recordInbound(message);
      } catch (err) {
        this.logger.error("failed to persist inbound message", { tenantId, err: String(err) });
      }
      await this.incomingQueue.add("inbound-message", message);
    });

    const outgoingQueue = createOutgoingQueue(tenantId, this.config.redisConnection);
    const outgoingWorker = createOutgoingWorker(tenantId, this.config.redisConnection, {
      rateLimit: this.config.outgoingRateLimit,
      rateWindowMs: this.config.outgoingRateWindowMs,
      logger: this.logger,
      sendMessage: (job) => channel.sendMessage({ to: job.to, content: job.content }),
      onSent: (job, result) =>
        this.messageRepository.recordOutbound({
          tenantId: job.tenantId,
          to: job.to,
          content: job.content,
          senderType: job.senderType,
          externalMessageId: result.externalMessageId,
        }),
    });

    this.sessions.set(tenantId, { channel, outgoingQueue, outgoingWorker });
    await channel.reconnect();
  }

  async stopTenant(tenantId: string): Promise<void> {
    const session = this.sessions.get(tenantId);
    if (!session) return;
    session.channel.disconnect();
    await session.outgoingWorker.close();
    await session.outgoingQueue.close();
    this.sessions.delete(tenantId);
  }

  async stopAll(): Promise<void> {
    await Promise.all([...this.sessions.keys()].map((tenantId) => this.stopTenant(tenantId)));
    await this.incomingQueue.close();
  }
}
