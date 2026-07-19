import { Queue } from "bullmq";
import type { Redis } from "ioredis";
import type { InboundMessage } from "@intelligencebiz/channel-core";

export const INCOMING_QUEUE_NAME = "whatsapp-incoming";

/**
 * Shared contract between whatsapp-worker (producer, on message received)
 * and apps/api (consumer, generates the AI reply) — both depend on this
 * package instead of one app depending on the other.
 */
export function createIncomingQueue(connection: Redis): Queue<InboundMessage> {
  return new Queue<InboundMessage>(INCOMING_QUEUE_NAME, {
    connection,
    defaultJobOptions: {
      attempts: 3,
      backoff: { type: "exponential", delay: 2000 },
      removeOnComplete: 1000,
      removeOnFail: 1000,
    },
  });
}
