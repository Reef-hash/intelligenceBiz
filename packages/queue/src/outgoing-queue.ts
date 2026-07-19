import { Queue } from "bullmq";
import type { Redis } from "ioredis";
import type { MessageContent } from "@intelligencebiz/channel-core";

export interface OutgoingJobData {
  tenantId: string;
  to: string;
  content: MessageContent;
  senderType: "ai_agent" | "human_agent";
}

export function outgoingQueueName(tenantId: string): string {
  return `whatsapp-outgoing:${tenantId}`;
}

/**
 * Shared contract between apps/api (producer, after generating a reply)
 * and whatsapp-worker (consumer, actually sends via BaileysChannel). One
 * queue per tenant so a disconnected tenant's backlog never blocks
 * another tenant's messages, and so the worker's rate limiter applies
 * per WhatsApp number.
 */
export function createOutgoingQueue(tenantId: string, connection: Redis): Queue<OutgoingJobData> {
  return new Queue<OutgoingJobData>(outgoingQueueName(tenantId), {
    connection,
    defaultJobOptions: {
      attempts: 5,
      backoff: { type: "exponential", delay: 2000 },
      removeOnComplete: 1000,
      removeOnFail: 1000,
    },
  });
}
