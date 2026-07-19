import { Injectable, Logger, type OnModuleDestroy, type OnModuleInit } from "@nestjs/common";
import { Worker, type Job } from "bullmq";
import type { Redis } from "ioredis";
import { AiEngine } from "@intelligencebiz/ai-engine";
import type { InboundMessage } from "@intelligencebiz/channel-core";
import { createServiceRoleClient, type TypedSupabaseClient } from "@intelligencebiz/database";
import { createOutgoingQueue, createRedisConnection, INCOMING_QUEUE_NAME } from "@intelligencebiz/queue";
import { loadConfig } from "../config.js";
import { findConversationId } from "./conversation-lookup.js";

/**
 * Drains the whatsapp-incoming queue that whatsapp-worker publishes to,
 * generates a reply via ai-engine, and enqueues it onto the tenant's
 * whatsapp-outgoing queue for whatsapp-worker to actually send. This is
 * the piece that closes the MVP loop: customer message in -> AI reply out.
 */
@Injectable()
export class IncomingMessageProcessor implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(IncomingMessageProcessor.name);
  private worker: Worker<InboundMessage> | undefined;
  private redisConnection: Redis | undefined;
  private supabase: TypedSupabaseClient | undefined;
  private aiEngine: AiEngine | undefined;

  onModuleInit(): void {
    const config = loadConfig();
    this.redisConnection = createRedisConnection(config.redisUrl);
    this.supabase = createServiceRoleClient({
      url: config.supabaseUrl,
      serviceRoleKey: config.supabaseServiceRoleKey,
    });
    this.aiEngine = new AiEngine(this.supabase);

    this.worker = new Worker<InboundMessage>(INCOMING_QUEUE_NAME, (job) => this.handle(job), {
      connection: this.redisConnection,
    });

    this.worker.on("failed", (job, err) => {
      this.logger.error(`inbound message job ${job?.id} failed: ${String(err)}`);
    });
  }

  async onModuleDestroy(): Promise<void> {
    await this.worker?.close();
    await this.redisConnection?.quit();
  }

  private async handle(job: Job<InboundMessage>): Promise<void> {
    if (!this.supabase || !this.aiEngine || !this.redisConnection) return;
    const message = job.data;

    const conversationId = await findConversationId(this.supabase, message.tenantId, message.from);
    if (!conversationId) {
      this.logger.debug(
        `skipping reply for tenant ${message.tenantId}: no conversation found or human takeover active`,
      );
      return;
    }

    const replyText = await this.aiEngine.generateReply({
      tenantId: message.tenantId,
      conversationId,
    });
    if (!replyText) return;

    const outgoingQueue = createOutgoingQueue(message.tenantId, this.redisConnection);
    await outgoingQueue.add("send-message", {
      tenantId: message.tenantId,
      to: message.from,
      content: { type: "text", text: replyText },
      senderType: "ai_agent",
    });
  }
}
